const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function safeFetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Unable to connect to MediVault backend server at ${API_BASE_URL}. Please ensure 'python manage.py runserver' is running.`
      );
    }
    throw err;
  }
}

async function parseResponse(response, endpointInfo) {
  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    throw new Error(
      `Server returned non-JSON response (${response.status} ${response.statusText}) for ${endpointInfo}.`
    );
  }

  if (!response.ok) {
    const errorMsg = typeof data === 'object'
      ? (data.error || data.detail || Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | '))
      : 'API request failed.';
    throw new Error(errorMsg);
  }

  return data;
}

export async function loginUser(username, password) {
  const response = await safeFetch(`${API_BASE_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return await parseResponse(response, 'POST /api/auth/login/');
}

export async function registerPatient(patientData) {
  const response = await safeFetch(`${API_BASE_URL}/api/auth/register/patient/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  return await parseResponse(response, 'POST /api/auth/register/patient/');
}

export async function registerDoctor(doctorData) {
  const response = await safeFetch(`${API_BASE_URL}/api/auth/register/doctor/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doctorData),
  });
  return await parseResponse(response, 'POST /api/auth/register/doctor/');
}

export async function getCurrentUser(token) {
  const response = await safeFetch(`${API_BASE_URL}/api/auth/me/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await parseResponse(response, 'GET /api/auth/me/');
}

export async function getMedicalRecords(token) {
  const response = await safeFetch(`${API_BASE_URL}/api/records/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await parseResponse(response, 'GET /api/records/');
}

export async function createMedicalRecord(token, recordData) {
  const response = await safeFetch(`${API_BASE_URL}/api/records/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recordData),
  });
  return await parseResponse(response, 'POST /api/records/');
}

export async function deleteMedicalRecord(token, recordId) {
  const response = await safeFetch(`${API_BASE_URL}/api/records/${recordId}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Token ${token}`,
    },
  });
  if (!response.ok && response.status !== 204) {
    return await parseResponse(response, `DELETE /api/records/${recordId}/`);
  }
  return true;
}

// Sharing API Helpers

export async function getPatientRecordShares(token) {
  const response = await safeFetch(`${API_BASE_URL}/api/shares/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await parseResponse(response, 'GET /api/shares/');
}

export async function grantRecordShare(token, shareData) {
  const response = await safeFetch(`${API_BASE_URL}/api/shares/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(shareData),
  });
  return await parseResponse(response, 'POST /api/shares/');
}

export async function revokeRecordShare(token, shareId) {
  const response = await safeFetch(`${API_BASE_URL}/api/shares/${shareId}/revoke/`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await parseResponse(response, `POST /api/shares/${shareId}/revoke/`);
}

export async function getDoctorSharedRecords(token) {
  const response = await safeFetch(`${API_BASE_URL}/api/doctor/shared-records/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await parseResponse(response, 'GET /api/doctor/shared-records/');
}

export async function getDoctorSharedRecordDetail(token, recordId) {
  const response = await safeFetch(`${API_BASE_URL}/api/doctor/shared-records/${recordId}/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await parseResponse(response, `GET /api/doctor/shared-records/${recordId}/`);
}

export async function getSharingActivityHistory(token) {
  const response = await safeFetch(`${API_BASE_URL}/api/shares/history/`, {
    method: 'GET',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return await parseResponse(response, 'GET /api/shares/history/');
}

