from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token

from .models import PatientProfile, DoctorProfile, MedicalRecord, RecordShare, SharingActivityLog
from .serializers import MedicalRecordSerializer, RecordShareSerializer, SharingActivityLogSerializer


def get_user_role(user):
    if hasattr(user, 'patient_profile'):
        return 'patient'
    elif hasattr(user, 'doctor_profile'):
        return 'doctor'
    elif user.is_superuser:
        return 'admin'
    return 'user'


class IsPatientUser(BasePermission):
    """
    Permission class allowing access only to authenticated users with a PatientProfile.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'patient_profile')
        )


class IsDoctorUser(BasePermission):
    """
    Permission class allowing access only to authenticated users with a DoctorProfile.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'doctor_profile')
        )


class MedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]

    def get_queryset(self):
        if hasattr(self.request.user, 'patient_profile'):
            return MedicalRecord.objects.filter(patient=self.request.user.patient_profile)
        return MedicalRecord.objects.none()

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user.patient_profile)


class RecordShareViewSet(viewsets.ModelViewSet):
    serializer_class = RecordShareSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsPatientUser]

    def get_queryset(self):
        if hasattr(self.request.user, 'patient_profile'):
            return RecordShare.objects.filter(record__patient=self.request.user.patient_profile)
        return RecordShare.objects.none()

    def create(self, request, *args, **kwargs):
        data = request.data
        record_id = data.get('record')
        doctor_id = data.get('doctor')
        expires_at_str = data.get('expires_at')

        if not record_id or not doctor_id:
            return Response({'error': 'Record ID and Doctor ID are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate record ownership
        record = MedicalRecord.objects.filter(id=record_id, patient=request.user.patient_profile).first()
        if not record:
            return Response({'error': 'Medical record not found or does not belong to you.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate target doctor
        doctor = None
        if isinstance(doctor_id, int) or (isinstance(doctor_id, str) and doctor_id.isdigit()):
            doctor_num = int(doctor_id)
            doctor = DoctorProfile.objects.filter(id=doctor_num).first()
            if not doctor:
                doctor = DoctorProfile.objects.filter(user_id=doctor_num).first()

        if not doctor and isinstance(doctor_id, str):
            doctor = DoctorProfile.objects.filter(user__username__iexact=doctor_id.strip()).first()

        if not doctor:
            return Response({'error': 'Doctor profile not found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate expires_at
        expires_at = None
        if expires_at_str:
            try:
                from django.utils.dateparse import parse_datetime
                expires_at = parse_datetime(expires_at_str)
                if expires_at and expires_at <= timezone.now():
                    return Response({'error': 'Expiration date must be in the future.'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                return Response({'error': 'Invalid expiration date format.'}, status=status.HTTP_400_BAD_REQUEST)

        share, created = RecordShare.objects.get_or_create(
            record=record,
            doctor=doctor,
            defaults={'is_active': True, 'expires_at': expires_at}
        )
        if not created:
            share.is_active = True
            share.revoked_at = None
            share.expires_at = expires_at
            share.save()

        # Record activity event for granting access
        SharingActivityLog.objects.create(
            patient=request.user.patient_profile,
            doctor=doctor,
            record=record,
            record_title=record.title,
            event_type='granted'
        )

        serializer = self.get_serializer(share)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'delete'])
    def revoke(self, request, pk=None):
        share = self.get_queryset().filter(pk=pk).first()
        if not share:
            return Response({'error': 'Share record not found.'}, status=status.HTTP_404_NOT_FOUND)

        share.is_active = False
        share.revoked_at = timezone.now()
        share.save()

        # Record activity event for revoking access
        SharingActivityLog.objects.create(
            patient=request.user.patient_profile,
            doctor=share.doctor,
            record=share.record,
            record_title=share.record.title if share.record else 'Medical Record',
            event_type='revoked'
        )

        serializer = self.get_serializer(share)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def history(self, request):
        if not hasattr(request.user, 'patient_profile'):
            return Response({'error': 'Only patients can view sharing history.'}, status=status.HTTP_403_FORBIDDEN)

        logs = SharingActivityLog.objects.filter(patient=request.user.patient_profile).order_by('-timestamp')
        serializer = SharingActivityLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DoctorSharedRecordViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MedicalRecordSerializer
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated, IsDoctorUser]

    def get_queryset(self):
        if not hasattr(self.request.user, 'doctor_profile'):
            return MedicalRecord.objects.none()

        now = timezone.now()
        doctor_profile = self.request.user.doctor_profile

        valid_shares = RecordShare.objects.filter(
            doctor=doctor_profile,
            is_active=True,
            revoked_at__isnull=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        )

        valid_record_ids = valid_shares.values_list('record_id', flat=True)
        return MedicalRecord.objects.filter(id__in=valid_record_ids)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_patient(request):
    data = request.data
    username = data.get('username')
    email = data.get('email', '')
    password = data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(password)
    except ValidationError as e:
        return Response({'error': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = User.objects.create_user(username=username, email=email, password=password)
            PatientProfile.objects.create(
                user=user,
                date_of_birth=data.get('date_of_birth') or None,
                phone=data.get('phone', ''),
                address=data.get('address', '')
            )
            token, _ = Token.objects.get_or_create(user=user)
    except Exception:
        return Response({'error': 'Failed to create patient account.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': 'patient'
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_doctor(request):
    data = request.data
    username = data.get('username')
    email = data.get('email', '')
    password = data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(password)
    except ValidationError as e:
        return Response({'error': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = User.objects.create_user(username=username, email=email, password=password)
            DoctorProfile.objects.create(
                user=user,
                specialization=data.get('specialization', ''),
                license_number=data.get('license_number', '')
            )
            token, _ = Token.objects.get_or_create(user=user)
    except Exception:
        return Response({'error': 'Failed to create doctor account.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': 'doctor'
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    data = request.data
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({'error': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        'token': token.key,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': get_user_role(user)
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def user_me(request):
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': get_user_role(user)
    }, status=status.HTTP_200_OK)
