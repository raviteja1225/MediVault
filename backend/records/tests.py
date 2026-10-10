from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from records.models import PatientProfile, DoctorProfile, MedicalRecord, RecordShare


class AuthTests(APITestCase):

    def test_patient_registration(self):
        url = reverse('register_patient')
        data = {
            'username': 'patient_john',
            'email': 'john@example.com',
            'password': 'StrongPassword123!',
            'phone': '1234567890'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['role'], 'patient')
        self.assertTrue(User.objects.filter(username='patient_john').exists())
        self.assertTrue(PatientProfile.objects.filter(user__username='patient_john').exists())

    def test_doctor_registration(self):
        url = reverse('register_doctor')
        data = {
            'username': 'dr_smith',
            'email': 'smith@example.com',
            'password': 'StrongPassword123!',
            'specialization': 'Cardiology'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['role'], 'doctor')
        self.assertTrue(User.objects.filter(username='dr_smith').exists())
        self.assertTrue(DoctorProfile.objects.filter(user__username='dr_smith').exists())

    def test_login_success(self):
        user = User.objects.create_user(username='login_user', password='Password123!')
        PatientProfile.objects.create(user=user)
        url = reverse('login')
        data = {'username': 'login_user', 'password': 'Password123!'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['user']['role'], 'patient')

    def test_login_invalid_credentials(self):
        User.objects.create_user(username='login_user2', password='Password123!')
        url = reverse('login')
        data = {'username': 'login_user2', 'password': 'WrongPassword!'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_authenticated(self):
        user = User.objects.create_user(username='me_user', email='me@example.com', password='Password123!')
        DoctorProfile.objects.create(user=user, specialization='Neurology')
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        url = reverse('user_me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'me_user')
        self.assertEqual(response.data['role'], 'doctor')

    def test_me_unauthenticated(self):
        url = reverse('user_me')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MedicalRecordTests(APITestCase):

    def setUp(self):
        self.patient_user_a = User.objects.create_user(username='patient_a', password='Password123!')
        self.patient_a = PatientProfile.objects.create(user=self.patient_user_a)
        self.token_a = Token.objects.create(user=self.patient_user_a)

        self.patient_user_b = User.objects.create_user(username='patient_b', password='Password123!')
        self.patient_b = PatientProfile.objects.create(user=self.patient_user_b)
        self.token_b = Token.objects.create(user=self.patient_user_b)

        self.doctor_user = User.objects.create_user(username='doctor_a', password='Password123!')
        self.doctor_a = DoctorProfile.objects.create(user=self.doctor_user)
        self.doctor_token = Token.objects.create(user=self.doctor_user)

        self.list_url = reverse('medical-record-list')

    def test_patient_crud_operations(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)

        # Create
        create_data = {
            'title': 'Blood Test Report',
            'record_type': 'lab_report',
            'description': 'Routine blood panel',
            'provider_name': 'Dr. Sarah Connor',
            'record_date': '2026-03-15'
        }
        create_resp = self.client.post(self.list_url, create_data, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_resp.data['provider_name'], 'Dr. Sarah Connor')
        record_id = create_resp.data['id']

        # List
        list_resp = self.client.get(self.list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)

        # Retrieve
        detail_url = reverse('medical-record-detail', kwargs={'pk': record_id})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_resp.data['title'], 'Blood Test Report')

        # Update
        update_data = {
            'title': 'Updated Blood Test Report',
            'record_type': 'lab_report',
            'description': 'Updated description',
            'record_date': '2026-03-15'
        }
        update_resp = self.client.put(detail_url, update_data, format='json')
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(update_resp.data['title'], 'Updated Blood Test Report')

        # Delete
        delete_resp = self.client.delete(detail_url)
        self.assertEqual(delete_resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_unauthenticated_records_access(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patient_isolation(self):
        record = MedicalRecord.objects.create(
            patient=self.patient_a,
            title='Private Scan A',
            record_type='scan',
            description='MRI Scan',
            record_date='2026-04-01'
        )

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_b.key)

        list_resp = self.client.get(self.list_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 0)

        detail_url = reverse('medical-record-detail', kwargs={'pk': record.id})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_404_NOT_FOUND)

        delete_resp = self.client.delete(detail_url)
        self.assertEqual(delete_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_doctor_denial(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.doctor_token.key)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_input_and_file_validation(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)

        resp_no_title = self.client.post(self.list_url, {
            'record_type': 'prescription',
            'record_date': '2026-03-01'
        }, format='json')
        self.assertEqual(resp_no_title.status_code, status.HTTP_400_BAD_REQUEST)

        resp_invalid_type = self.client.post(self.list_url, {
            'title': 'Test',
            'record_type': 'invalid_type',
            'record_date': '2026-03-01'
        }, format='json')
        self.assertEqual(resp_invalid_type.status_code, status.HTTP_400_BAD_REQUEST)

        bad_file = SimpleUploadedFile("virus.exe", b"executable_content", content_type="application/octet-stream")
        resp_bad_file = self.client.post(self.list_url, {
            'title': 'Bad File Record',
            'record_type': 'other',
            'record_date': '2026-03-01',
            'file': bad_file
        }, format='multipart')
        self.assertEqual(resp_bad_file.status_code, status.HTTP_400_BAD_REQUEST)

        good_file = SimpleUploadedFile("report.pdf", b"%PDF-1.4 header content", content_type="application/pdf")
        resp_good_file = self.client.post(self.list_url, {
            'title': 'PDF Record',
            'record_type': 'lab_report',
            'record_date': '2026-03-01',
            'file': good_file
        }, format='multipart')
        self.assertEqual(resp_good_file.status_code, status.HTTP_201_CREATED)

    def test_ownership_manipulation_prevented(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)
        data = {
            'title': 'Attempted Hack',
            'record_type': 'diagnosis',
            'record_date': '2026-03-10',
            'patient': self.patient_b.id,
            'patient_id': self.patient_b.id
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        record = MedicalRecord.objects.get(id=response.data['id'])
        self.assertEqual(record.patient, self.patient_a)
        self.assertNotEqual(record.patient, self.patient_b)


class RecordShareTests(APITestCase):

    def setUp(self):
        self.patient_user_a = User.objects.create_user(username='patient_share_a', password='Password123!')
        self.patient_a = PatientProfile.objects.create(user=self.patient_user_a)
        self.token_a = Token.objects.create(user=self.patient_user_a)

        self.patient_user_b = User.objects.create_user(username='patient_share_b', password='Password123!')
        self.patient_b = PatientProfile.objects.create(user=self.patient_user_b)
        self.token_b = Token.objects.create(user=self.patient_user_b)

        self.doctor_user_a = User.objects.create_user(username='doctor_share_a', password='Password123!')
        self.doctor_a = DoctorProfile.objects.create(user=self.doctor_user_a, specialization='Cardiology')
        self.doctor_token_a = Token.objects.create(user=self.doctor_user_a)

        self.record_a = MedicalRecord.objects.create(
            patient=self.patient_a,
            title='Patient A Lab Report',
            record_type='lab_report',
            description='ECG Results',
            record_date='2026-04-05'
        )

        self.shares_url = reverse('record-share-list')
        self.doctor_shared_records_url = reverse('doctor-shared-record-list')

    def test_grant_access_success(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)
        data = {
            'record': self.record_a.id,
            'doctor': self.doctor_a.id
        }
        response = self.client.post(self.shares_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['record'], self.record_a.id)
        self.assertEqual(response.data['doctor'], self.doctor_a.id)
        self.assertTrue(response.data['is_valid'])

    def test_wrong_owner_denial(self):
        # Patient B tries to share Patient A's record
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_b.key)
        data = {
            'record': self.record_a.id,
            'doctor': self.doctor_a.id
        }
        response = self.client.post(self.shares_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_access_shared_record(self):
        # Patient A grants access to Doctor A
        RecordShare.objects.create(record=self.record_a, doctor=self.doctor_a)

        # Doctor A lists shared records
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.doctor_token_a.key)
        list_resp = self.client.get(self.doctor_shared_records_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 1)
        self.assertEqual(list_resp.data[0]['title'], 'Patient A Lab Report')

        # Doctor A retrieves detail of shared record
        detail_url = reverse('doctor-shared-record-detail', kwargs={'pk': self.record_a.id})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_resp.data['id'], self.record_a.id)

    def test_denial_for_unshared_records(self):
        # Unshared record exists
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.doctor_token_a.key)
        detail_url = reverse('doctor-shared-record-detail', kwargs={'pk': self.record_a.id})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_expired_shares(self):
        past_time = timezone.now() - timedelta(days=1)
        RecordShare.objects.create(record=self.record_a, doctor=self.doctor_a, expires_at=past_time)

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.doctor_token_a.key)
        list_resp = self.client.get(self.doctor_shared_records_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_resp.data), 0)

        detail_url = reverse('doctor-shared-record-detail', kwargs={'pk': self.record_a.id})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_revoked_shares(self):
        share = RecordShare.objects.create(record=self.record_a, doctor=self.doctor_a)

        # Patient A revokes share
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)
        revoke_url = reverse('record-share-revoke', kwargs={'pk': share.id})
        revoke_resp = self.client.post(revoke_url)
        self.assertEqual(revoke_resp.status_code, status.HTTP_200_OK)

        # Doctor A attempts to access revoked share
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.doctor_token_a.key)
        detail_url = reverse('doctor-shared-record-detail', kwargs={'pk': self.record_a.id})
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_404_NOT_FOUND)

        # Verify underlying MedicalRecord is NOT deleted
        self.assertTrue(MedicalRecord.objects.filter(id=self.record_a.id).exists())

    def test_doctor_attempts_grant_or_revoke(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.doctor_token_a.key)

        # Doctor attempts to grant share
        grant_resp = self.client.post(self.shares_url, {'record': self.record_a.id, 'doctor': self.doctor_a.id}, format='json')
        self.assertEqual(grant_resp.status_code, status.HTTP_403_FORBIDDEN)

        # Doctor attempts to revoke share
        share = RecordShare.objects.create(record=self.record_a, doctor=self.doctor_a)
        revoke_url = reverse('record-share-revoke', kwargs={'pk': share.id})
        revoke_resp = self.client.post(revoke_url)
        self.assertEqual(revoke_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_sharing_requests(self):
        grant_resp = self.client.post(self.shares_url, {'record': self.record_a.id, 'doctor': self.doctor_a.id}, format='json')
        self.assertEqual(grant_resp.status_code, status.HTTP_401_UNAUTHORIZED)

        list_resp = self.client.get(self.doctor_shared_records_url)
        self.assertEqual(list_resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rejection_of_non_doctor_recipient(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)
        data = {
            'record': self.record_a.id,
            'doctor': 99999
        }
        response = self.client.post(self.shares_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Doctor profile not found', response.data['error'])

    def test_grant_and_revoke_activity_logging(self):
        history_url = reverse('record-share-history')

        # Patient A grants access
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_a.key)
        grant_resp = self.client.post(self.shares_url, {'record': self.record_a.id, 'doctor': self.doctor_a.id}, format='json')
        self.assertEqual(grant_resp.status_code, status.HTTP_201_CREATED)
        share_id = grant_resp.data['id']

        # Verify grant event logged
        hist_resp = self.client.get(history_url)
        self.assertEqual(hist_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(hist_resp.data), 1)
        self.assertEqual(hist_resp.data[0]['event_type'], 'granted')
        self.assertEqual(hist_resp.data[0]['record_title'], 'Patient A Lab Report')

        # Patient A revokes access
        revoke_url = reverse('record-share-revoke', kwargs={'pk': share_id})
        revoke_resp = self.client.post(revoke_url)
        self.assertEqual(revoke_resp.status_code, status.HTTP_200_OK)

        # Verify revoke event logged and newest first
        hist_resp2 = self.client.get(history_url)
        self.assertEqual(hist_resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(hist_resp2.data), 2)
        self.assertEqual(hist_resp2.data[0]['event_type'], 'revoked')
        self.assertEqual(hist_resp2.data[1]['event_type'], 'granted')

    def test_sharing_history_patient_isolation_and_auth(self):
        history_url = reverse('record-share-history')

        # Patient B gets empty history
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token_b.key)
        b_hist = self.client.get(history_url)
        self.assertEqual(b_hist.status_code, status.HTTP_200_OK)
        self.assertEqual(len(b_hist.data), 0)

        # Doctor gets forbidden
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.doctor_token_a.key)
        doc_hist = self.client.get(history_url)
        self.assertEqual(doc_hist.status_code, status.HTTP_403_FORBIDDEN)

        # Unauthenticated gets 401
        self.client.credentials()
        unauth_hist = self.client.get(history_url)
        self.assertEqual(unauth_hist.status_code, status.HTTP_401_UNAUTHORIZED)
