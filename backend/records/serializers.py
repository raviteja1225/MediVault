import os
from django.utils import timezone
from rest_framework import serializers
from .models import MedicalRecord, RecordShare, DoctorProfile, SharingActivityLog

ALLOWED_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.docx']
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


class MedicalRecordSerializer(serializers.ModelSerializer):
    patient_username = serializers.ReadOnlyField(source='patient.user.username')
    patient_name = serializers.ReadOnlyField(source='patient.user.get_full_name')

    class Meta:
        model = MedicalRecord
        fields = ['id', 'title', 'record_type', 'description', 'provider_name', 'record_date', 'file', 'created_at', 'patient_username', 'patient_name']
        read_only_fields = ['id', 'created_at']

    def validate_file(self, value):
        if value:
            ext = os.path.splitext(value.name)[1].lower()
            if ext not in ALLOWED_FILE_EXTENSIONS:
                raise serializers.ValidationError(
                    f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_FILE_EXTENSIONS)}"
                )
            if value.size > MAX_FILE_SIZE_BYTES:
                raise serializers.ValidationError("File size exceeds 5 MB limit.")
        return value


class RecordShareSerializer(serializers.ModelSerializer):
    doctor_username = serializers.ReadOnlyField(source='doctor.user.username')
    doctor_name = serializers.ReadOnlyField(source='doctor.user.get_full_name')
    doctor_specialization = serializers.ReadOnlyField(source='doctor.specialization')
    record_title = serializers.ReadOnlyField(source='record.title')
    is_valid = serializers.BooleanField(source='is_valid_permission', read_only=True)

    class Meta:
        model = RecordShare
        fields = [
            'id', 'record', 'record_title', 'doctor', 'doctor_username',
            'doctor_name', 'doctor_specialization', 'granted_at',
            'expires_at', 'revoked_at', 'is_active', 'is_valid'
        ]
        read_only_fields = ['id', 'granted_at', 'revoked_at', 'is_active', 'is_valid']


class SharingActivityLogSerializer(serializers.ModelSerializer):
    doctor_username = serializers.ReadOnlyField(source='doctor.user.username')
    doctor_name = serializers.ReadOnlyField(source='doctor.user.get_full_name')
    doctor_specialization = serializers.ReadOnlyField(source='doctor.specialization')

    class Meta:
        model = SharingActivityLog
        fields = [
            'id', 'event_type', 'timestamp', 'record_title',
            'doctor', 'doctor_username', 'doctor_name', 'doctor_specialization'
        ]
        read_only_fields = ['id', 'timestamp']
