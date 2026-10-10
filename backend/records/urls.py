from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    register_patient, register_doctor, login_user, user_me,
    MedicalRecordViewSet, RecordShareViewSet, DoctorSharedRecordViewSet
)

router = DefaultRouter()
router.register(r'records', MedicalRecordViewSet, basename='medical-record')
router.register(r'shares', RecordShareViewSet, basename='record-share')
router.register(r'doctor/shared-records', DoctorSharedRecordViewSet, basename='doctor-shared-record')

urlpatterns = [
    path('auth/register/patient/', register_patient, name='register_patient'),
    path('auth/register/doctor/', register_doctor, name='register_doctor'),
    path('auth/login/', login_user, name='login'),
    path('auth/me/', user_me, name='user_me'),
    path('', include(router.urls)),
]
