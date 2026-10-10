from django.db import models
from django.contrib.auth.models import User


class PatientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='patient_profile')
    date_of_birth = models.DateField(null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, default='')
    address = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        name = self.user.get_full_name() or self.user.username
        return f"Patient: {name}"


class DoctorProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='doctor_profile')
    specialization = models.CharField(max_length=100, blank=True, default='')
    license_number = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        name = self.user.get_full_name() or self.user.username
        spec = f" ({self.specialization})" if self.specialization else ""
        return f"Dr. {name}{spec}"


class MedicalRecord(models.Model):
    RECORD_TYPE_CHOICES = [
        ('prescription', 'Prescription'),
        ('lab_report', 'Lab Report'),
        ('diagnosis', 'Diagnosis'),
        ('scan', 'Scan'),
        ('other', 'Other'),
    ]

    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='medical_records')
    title = models.CharField(max_length=255)
    record_type = models.CharField(max_length=20, choices=RECORD_TYPE_CHOICES, default='other')
    description = models.TextField(blank=True, default='')
    provider_name = models.CharField(max_length=255, blank=True, default='')
    record_date = models.DateField()
    file = models.FileField(upload_to='medical_records/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_record_type_display()}) - {self.patient}"


class RecordShare(models.Model):
    record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name='shares')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='shared_records')
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['record', 'doctor'],
                condition=models.Q(is_active=True),
                name='unique_active_record_doctor_share'
            )
        ]

    @property
    def is_valid_permission(self):
        from django.utils import timezone
        if not self.is_active or self.revoked_at is not None:
            return False
        if self.expires_at and self.expires_at <= timezone.now():
            return False
        return True

    def __str__(self):
        return f"Share: {self.record.title} -> {self.doctor}"


class SharingActivityLog(models.Model):
    EVENT_TYPE_CHOICES = [
        ('granted', 'Granted'),
        ('revoked', 'Revoked'),
    ]

    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name='sharing_activities')
    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name='sharing_activities')
    record = models.ForeignKey(MedicalRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name='sharing_activities')
    record_title = models.CharField(max_length=255)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.patient} {self.event_type} access for {self.record_title} to {self.doctor}"
