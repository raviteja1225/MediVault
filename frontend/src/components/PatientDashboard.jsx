import React, { useState, useEffect } from 'react';
import {
  getMedicalRecords,
  createMedicalRecord,
  deleteMedicalRecord,
  getPatientRecordShares,
  grantRecordShare,
  revokeRecordShare,
  getSharingActivityHistory,
} from '../api';
import { exportRecordToPdf } from '../utils/exportPdf';

export default function PatientDashboard({ user, token, onLogout }) {
  const [records, setRecords] = useState([]);
  const [shares, setShares] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, title
  const [shareFilterStatus, setShareFilterStatus] = useState('all'); // all, active, revoked


  // Record Form toggle & state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [recordType, setRecordType] = useState('prescription');
  const [providerName, setProviderName] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Record Delete modal state
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Share Form & State
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareRecordId, setShareRecordId] = useState('');
  const [doctorIdentifier, setDoctorIdentifier] = useState('');
  const [shareExpiresAt, setShareExpiresAt] = useState('');
  const [submittingShare, setSubmittingShare] = useState(false);

  // Share Revoke modal state
  const [shareToRevoke, setShareToRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsData, sharesData, historyData] = await Promise.all([
        getMedicalRecords(token),
        getPatientRecordShares(token),
        getSharingActivityHistory(token),
      ]);
      setRecords(recordsData);
      setShares(sharesData);
      setHistory(historyData);
    } catch (err) {
      if (err.message.includes('Session expired') || err.message.includes('invalid token')) {
        onLogout();
      } else {
        setError(err.message || 'Failed to load patient dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const getFilteredRecords = () => {
    let filtered = records;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.record_type && r.record_type.toLowerCase().includes(q)) ||
        (r.provider_name && r.provider_name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q))
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(r => r.record_type === filterType);
    }
    
    if (dateFrom) {
      filtered = filtered.filter(r => r.record_date >= dateFrom);
    }
    
    if (dateTo) {
      filtered = filtered.filter(r => r.record_date <= dateTo);
    }
    
    filtered = [...filtered];
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.record_date) - new Date(a.record_date);
      } else if (sortBy === 'oldest') {
        return new Date(a.record_date) - new Date(b.record_date);
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
    
    return filtered;
  };

  const getFilteredShares = () => {
    let filtered = shares;
    if (shareFilterStatus === 'active') {
      filtered = filtered.filter(s => s.is_valid);
    } else if (shareFilterStatus === 'revoked') {
      filtered = filtered.filter(s => !s.is_valid);
    }
    return filtered;
  };

  const setRecentRecordsQuickFilter = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setDateTo('');
    setFilterType('all');
    setSearchQuery('');
  };

  const clearRecordsFilter = () => {
    setSearchQuery('');
    setFilterType('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('newest');
  };

  const filteredRecords = getFilteredRecords();
  const filteredShares = getFilteredShares();


  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const newRecord = await createMedicalRecord(token, {
        title,
        record_type: recordType,
        provider_name: providerName,
        record_date: recordDate,
        description,
      });

      setSuccessMsg(`Medical record "${newRecord.title}" saved successfully!`);
      setTitle('');
      setProviderName('');
      setDescription('');
      setRecordDate(new Date().toISOString().split('T')[0]);
      setRecordType('prescription');
      setShowCreateForm(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create medical record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;
    setError(null);
    setSuccessMsg(null);
    setDeleting(true);

    try {
      await deleteMedicalRecord(token, recordToDelete.id);
      setSuccessMsg(`Medical record "${recordToDelete.title}" deleted.`);
      setRecordToDelete(null);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const handleGrantShare = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmittingShare(true);

    try {
      const shareData = {
        record: shareRecordId,
        doctor: doctorIdentifier,
        expires_at: shareExpiresAt ? new Date(shareExpiresAt).toISOString() : null,
      };

      await grantRecordShare(token, shareData);
      setSuccessMsg(`Access granted successfully to doctor "${doctorIdentifier}"!`);
      setShareRecordId('');
      setDoctorIdentifier('');
      setShareExpiresAt('');
      setShowShareForm(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to grant sharing permission.');
    } finally {
      setSubmittingShare(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareToRevoke) return;
    setError(null);
    setSuccessMsg(null);
    setRevoking(true);

    try {
      await revokeRecordShare(token, shareToRevoke.id);
      setSuccessMsg(`Doctor access for record "${shareToRevoke.record_title}" revoked.`);
      setShareToRevoke(null);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to revoke access.');
    } finally {
      setRevoking(false);
    }
  };

  const getBadgeClass = (type) => {
    switch (type) {
      case 'prescription':
        return 'bg-primary';
      case 'lab_report':
        return 'bg-info text-dark';
      case 'diagnosis':
        return 'bg-warning text-dark';
      case 'scan':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="container py-4">
      {/* Welcome Banner */}
      <div className="card border-0 shadow-sm rounded-4 bg-primary text-white p-4 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center">
          <div>
            <span className="badge bg-white text-primary mb-2 px-3 py-2 rounded-pill fw-bold">
              👤 Patient Portal
            </span>
            <h2 className="fw-bold mb-1">Welcome back, {user.username}!</h2>
            <p className="mb-0 opacity-90">Manage your personal medical records and authorized doctor permissions securely.</p>
          </div>
          <button className="btn btn-light text-primary fw-semibold mt-3 mt-md-0 px-4 rounded-3" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show rounded-3 mb-4" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)} aria-label="Close"></button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show rounded-3 mb-4" role="alert">
          {successMsg}
          <button type="button" className="btn-close" onClick={() => setSuccessMsg(null)} aria-label="Close"></button>
        </div>
      )}

      {/* Records Section Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1 text-dark">My Medical Records</h3>
          <p className="text-secondary small mb-0">Total records stored: {records.length}</p>
        </div>
        <div className="d-flex gap-2">
          <button
            className={`btn ${showCreateForm ? 'btn-outline-secondary' : 'btn-primary'} px-3 py-2 rounded-3 fw-bold`}
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setShowShareForm(false);
            }}
          >
            {showCreateForm ? 'Cancel' : '+ Add Record'}
          </button>
          <button
            className={`btn ${showShareForm ? 'btn-outline-secondary' : 'btn-outline-primary'} px-3 py-2 rounded-3 fw-bold`}
            onClick={() => {
              setShowShareForm(!showShareForm);
              setShowCreateForm(false);
            }}
            disabled={records.length === 0}
          >
            {showShareForm ? 'Cancel' : '🤝 Share Record'}
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      {!loading && records.length > 0 && (
        <div className="card p-3 mb-4 border-0 shadow-sm rounded-4 bg-light">
          <div className="row g-2 mb-3">
            <div className="col-12 col-md-6 col-lg-3">
              <input 
                type="text" 
                className="form-control rounded-3" 
                placeholder="🔍 Search title, provider, notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-2">
              <select className="form-select rounded-3" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="prescription">Prescription</option>
                <option value="lab_report">Lab Report</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="scan">Scan / X-Ray</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="input-group">
                <span className="input-group-text bg-light text-secondary border-end-0" title="Start Date">Start</span>
                <input type="date" className="form-control rounded-3 border-start-0 ps-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Start Date" />
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="input-group">
                <span className="input-group-text bg-light text-secondary border-end-0" title="End Date">End</span>
                <input type="date" className="form-control rounded-3 border-start-0 ps-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="End Date" />
              </div>
            </div>
            <div className="col-12 col-md-4 col-lg-3">
              <select className="form-select rounded-3" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="title">Sort: Title A-Z</option>
              </select>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-primary rounded-pill fw-semibold" onClick={clearRecordsFilter}>All Records</button>
              <button className="btn btn-sm btn-outline-info rounded-pill fw-semibold text-dark" onClick={setRecentRecordsQuickFilter}>Recent (30 Days)</button>
            </div>
            {(searchQuery || filterType !== 'all' || dateFrom || dateTo || sortBy !== 'newest') && (
              <button className="btn btn-sm btn-link text-danger text-decoration-none" onClick={clearRecordsFilter}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}


      {/* Collapsible Create Record Form */}
      {showCreateForm && (
        <div className="mv-card p-4 p-sm-5 mb-4 border-primary">
          <h4 className="fw-bold text-dark mb-3">Add New Medical Record</h4>
          <form onSubmit={handleCreateRecord}>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold small text-secondary">Record Title *</label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Blood Pressure Checkup"
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold small text-secondary">Record Type *</label>
                <select
                  className="form-select rounded-3"
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  required
                >
                  <option value="prescription">Prescription</option>
                  <option value="lab_report">Lab Report</option>
                  <option value="diagnosis">Diagnosis</option>
                  <option value="scan">Scan / X-Ray</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold small text-secondary">Doctor / Healthcare Provider</label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Connor"
                />
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold small text-secondary">Record Date *</label>
                <input
                  type="date"
                  className="form-control rounded-3"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold small text-secondary">Description / Notes</label>
              <textarea
                className="form-control rounded-3"
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details, dosage instructions, or medical notes..."
              ></textarea>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary px-4 rounded-3"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4 rounded-3 fw-bold"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ) : null}
                {submitting ? 'Saving Record...' : 'Save Medical Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collapsible Share Record Form */}
      {showShareForm && (
        <div className="mv-card p-4 p-sm-5 mb-4 border-info">
          <h4 className="fw-bold text-dark mb-1">Grant Doctor Access</h4>
          <p className="text-secondary small mb-3">
            Authorize a registered doctor to view your medical record securely.
          </p>
          <form onSubmit={handleGrantShare}>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold small text-secondary">Select Medical Record *</label>
                <select
                  className="form-select rounded-3"
                  value={shareRecordId}
                  onChange={(e) => setShareRecordId(e.target.value)}
                  required
                >
                  <option value="">-- Choose a record --</option>
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.record_date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold small text-secondary">Doctor Username or Profile ID *</label>
                <input
                  type="text"
                  className="form-control rounded-3"
                  value={doctorIdentifier}
                  onChange={(e) => setDoctorIdentifier(e.target.value)}
                  placeholder="e.g. dr_smith or doctor_a"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold small text-secondary">Access Expiration Date & Time (Optional)</label>
              <input
                type="datetime-local"
                className="form-control rounded-3"
                value={shareExpiresAt}
                onChange={(e) => setShareExpiresAt(e.target.value)}
              />
              <span className="form-text text-muted small">
                Leave blank for non-expiring access. You can revoke access at any time.
              </span>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary px-4 rounded-3"
                onClick={() => setShowShareForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-info text-white px-4 rounded-3 fw-bold"
                disabled={submittingShare}
              >
                {submittingShare ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ) : null}
                {submittingShare ? 'Granting Access...' : 'Grant Access'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records List Container */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading records...</span>
          </div>
          <p className="mt-2 text-secondary small">Fetching your medical records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="mv-card p-5 text-center my-4">
          <div className="fs-1 text-secondary mb-2">📋</div>
          <h5 className="fw-bold text-dark">No Medical Records Stored Yet</h5>
          <p className="text-secondary small mb-3">
            Keep track of your health journey by adding your first prescription or report.
          </p>
          <button
            className="btn btn-primary px-4 py-2 rounded-3 fw-bold"
            onClick={() => setShowCreateForm(true)}
          >
            + Add First Record
          </button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border my-4">
          <div className="fs-3 text-secondary mb-2">🔍</div>
          <h6 className="fw-bold text-secondary">No records match your filters</h6>
          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={clearRecordsFilter}>Clear Filters</button>
        </div>
      ) : (
        <div className="row g-4 mb-5">
          {filteredRecords.map((rec) => (
            <div key={rec.id} className="col-md-6 col-lg-4">
              <div className="mv-card p-4 h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className={`badge ${getBadgeClass(rec.record_type)} px-2 py-1 text-uppercase`}>
                    {rec.record_type.replace('_', ' ')}
                  </span>
                  <span className="text-secondary small">{rec.record_date}</span>
                </div>

                <h5 className="fw-bold text-dark mb-1">{rec.title}</h5>

                {rec.provider_name && (
                  <p className="text-primary small mb-2 fw-semibold">
                    🩺 Provider: {rec.provider_name}
                  </p>
                )}

                <p className="text-secondary small flex-grow-1 mb-3">
                  {rec.description || <em className="text-muted">No description provided.</em>}
                </p>

                <div className="pt-3 border-top d-flex justify-content-between align-items-center mt-auto">
                  <button
                    className="btn btn-outline-primary btn-sm px-2 py-1 rounded-3 d-flex align-items-center gap-1"
                    onClick={() => exportRecordToPdf(rec, user.username)}
                    title="Download PDF"
                  >
                    <span>📄</span> Download PDF
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm px-3 py-1 rounded-3"
                    onClick={() => setRecordToDelete(rec)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Sharing Permissions Section */}
      <div className="mt-5">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h4 className="fw-bold text-dark mb-0">Active Doctor Sharing Permissions</h4>
          {shares.length > 0 && (
            <select 
              className="form-select form-select-sm w-auto rounded-3" 
              value={shareFilterStatus} 
              onChange={(e) => setShareFilterStatus(e.target.value)}
            >
              <option value="all">All Shares</option>
              <option value="active">Active Only</option>
              <option value="revoked">Revoked/Expired</option>
            </select>
          )}
        </div>
        {shares.length === 0 ? (
          <div className="mv-card p-4 text-center">
            <p className="text-secondary small mb-0">
              No active doctor access permissions. Use "Share Record" above to grant a doctor access.
            </p>
          </div>
        ) : filteredShares.length === 0 ? (
          <div className="text-center py-4 bg-light rounded-4 border">
            <p className="text-secondary small mb-0">No shares match the selected filter.</p>
          </div>
        ) : (
          <div className="mv-card p-3">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>Record Title</th>
                    <th>Doctor</th>
                    <th>Specialization</th>
                    <th>Granted Date</th>
                    <th>Expiration</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShares.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-semibold text-dark">{s.record_title}</td>
                      <td>Dr. {s.doctor_username}</td>
                      <td>{s.doctor_specialization || 'General'}</td>
                      <td>{new Date(s.granted_at).toLocaleDateString()}</td>
                      <td>{s.expires_at ? new Date(s.expires_at).toLocaleString() : 'Never'}</td>
                      <td>
                        <span className={`badge ${s.is_valid ? 'bg-success' : 'bg-secondary'}`}>
                          {s.is_valid ? 'Active' : 'Revoked/Expired'}
                        </span>
                      </td>
                      <td className="text-end">
                        {s.is_valid ? (
                          <button
                            className="btn btn-outline-danger btn-sm px-2 py-1 rounded-3"
                            onClick={() => setShareToRevoke(s)}
                          >
                            Revoke Access
                          </button>
                        ) : (
                          <span className="text-muted small">Revoked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Sharing Activity History Section */}
      <div className="mt-5 mb-4">
        <h4 className="fw-bold text-dark mb-3">📜 Sharing Activity History</h4>
        {history.length === 0 ? (
          <div className="mv-card p-4 text-center">
            <p className="text-secondary small mb-0">
              No sharing activity recorded yet. Grant or revoke doctor access to see your permanent audit log.
            </p>
          </div>
        ) : (
          <div className="mv-card p-4">
            <div className="timeline">
              {history.map((event) => (
                <div key={event.id} className="d-flex align-items-start pb-3 mb-3 border-bottom last-border-0">
                  <div className="me-3 fs-4">
                    {event.event_type === 'granted' ? '🟢' : '🔴'}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                      <span className="fw-bold text-dark me-2">
                        {event.record_title}
                      </span>
                      <span className="badge bg-light text-secondary border small">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="small text-secondary mt-1">
                      Action: {' '}
                      <span className={`badge ${event.event_type === 'granted' ? 'bg-success' : 'bg-warning text-dark'} px-2 py-1 me-2`}>
                        {event.event_type.toUpperCase()}
                      </span>
                      Doctor: <strong className="text-dark">Dr. {event.doctor_username}</strong>
                      {event.doctor_specialization ? ` (${event.doctor_specialization})` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Delete Record Confirmation Modal */}
      {recordToDelete && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete Record</h5>
                <button type="button" className="btn-close" onClick={() => setRecordToDelete(null)}></button>
              </div>
              <div className="modal-body py-3">
                <p className="mb-1">Are you sure you want to delete this medical record?</p>
                <div className="p-3 bg-light rounded-3 my-2 border">
                  <strong>{recordToDelete.title}</strong>
                  <div className="small text-secondary">{recordToDelete.record_date} | {recordToDelete.record_type}</div>
                </div>
                <p className="small text-muted mb-0">This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light px-4 rounded-3"
                  onClick={() => setRecordToDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger px-4 rounded-3 fw-bold"
                  onClick={handleDeleteRecord}
                  disabled={deleting}
                >
                  {deleting ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ) : null}
                  {deleting ? 'Deleting...' : 'Delete Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Share Confirmation Modal */}
      {shareToRevoke && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-warning text-dark">Confirm Revoke Access</h5>
                <button type="button" className="btn-close" onClick={() => setShareToRevoke(null)}></button>
              </div>
              <div className="modal-body py-3">
                <p className="mb-1">Are you sure you want to revoke doctor access for this record?</p>
                <div className="p-3 bg-light rounded-3 my-2 border">
                  <strong>Record: {shareToRevoke.record_title}</strong>
                  <div className="small text-secondary">Doctor: Dr. {shareToRevoke.doctor_username}</div>
                </div>
                <p className="small text-muted mb-0">Dr. {shareToRevoke.doctor_username} will immediately lose access to view this record.</p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-light px-4 rounded-3"
                  onClick={() => setShareToRevoke(null)}
                  disabled={revoking}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning px-4 rounded-3 fw-bold"
                  onClick={handleRevokeShare}
                  disabled={revoking}
                >
                  {revoking ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ) : null}
                  {revoking ? 'Revoking...' : 'Revoke Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
