import React, { useState, useEffect } from 'react';
import { getDoctorSharedRecords, getDoctorSharedRecordDetail } from '../api';

export default function DoctorDashboard({ user, token, onLogout }) {
  const [sharedRecords, setSharedRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, title

  // Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchSharedRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctorSharedRecords(token);
      setSharedRecords(data);
    } catch (err) {
      if (err.message.includes('Session expired') || err.message.includes('invalid token')) {
        onLogout();
      } else {
        setError(err.message || 'Failed to load shared patient records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSharedRecords();
    }
  }, [token]);

  const getFilteredRecords = () => {
    let filtered = sharedRecords;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.record_type && r.record_type.toLowerCase().includes(q)) ||
        (r.provider_name && r.provider_name.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.patient_username && r.patient_username.toLowerCase().includes(q)) ||
        (r.patient_name && r.patient_name.toLowerCase().includes(q))
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

  const setRecentRecordsQuickFilter = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setDateTo('');
    setFilterType('all');
    setSearchQuery('');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('newest');
  };

  const filteredRecords = getFilteredRecords();


  const handleSelectRecord = async (recordId) => {
    setError(null);
    setLoadingDetail(true);
    try {
      const detail = await getDoctorSharedRecordDetail(token, recordId);
      setSelectedRecord(detail);
    } catch (err) {
      setError(err.message || 'Unable to retrieve record details. Sharing permission may be revoked or expired.');
      setSelectedRecord(null);
    } finally {
      setLoadingDetail(false);
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
      <div className="card border-0 shadow-sm rounded-4 text-white p-4 mb-4" style={{ backgroundColor: '#0d9488' }}>
        <div className="d-flex flex-wrap justify-content-between align-items-center">
          <div>
            <span className="badge bg-white text-dark mb-2 px-3 py-2 rounded-pill fw-bold">
              🩺 Doctor Portal
            </span>
            <h2 className="fw-bold mb-1">Dr. {user.username}</h2>
            <p className="mb-0 opacity-90">View patient medical records explicitly shared with your account.</p>
          </div>
          <button className="btn btn-light text-dark fw-semibold mt-3 mt-md-0 px-4 rounded-3" onClick={onLogout}>
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

      {/* Shared Records Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1 text-dark">Authorized Patient Records</h3>
          <p className="text-secondary small mb-0">Click any card to view full medical details ({sharedRecords.length} active)</p>
        </div>
        <button className="btn btn-outline-primary btn-sm px-3 rounded-3" onClick={fetchSharedRecords}>
          🔄 Refresh Shared Records
        </button>
      </div>

      {/* Filters and Search Bar */}
      {!loading && sharedRecords.length > 0 && (
        <div className="card p-3 mb-4 border-0 shadow-sm rounded-4 bg-light" style={{ borderLeft: '4px solid #0d9488' }}>
          <div className="row g-2 mb-3">
            <div className="col-12 col-md-6 col-lg-3">
              <input 
                type="text" 
                className="form-control rounded-3" 
                placeholder="🔍 Search patient, title, diagnosis..." 
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
              <button className="btn btn-sm btn-outline-teal rounded-pill fw-semibold" style={{ borderColor: '#0d9488', color: '#0d9488' }} onClick={clearFilters}>All Records</button>
              <button className="btn btn-sm btn-outline-info rounded-pill fw-semibold text-dark" onClick={setRecentRecordsQuickFilter}>Recent (30 Days)</button>
            </div>
            {(searchQuery || filterType !== 'all' || dateFrom || dateTo || sortBy !== 'newest') && (
              <button className="btn btn-sm btn-link text-danger text-decoration-none" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}


      {/* Shared Records Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-teal" style={{ color: '#0d9488' }} role="status">
            <span className="visually-hidden">Loading shared records...</span>
          </div>
          <p className="mt-2 text-secondary small">Fetching authorized patient records...</p>
        </div>
      ) : sharedRecords.length === 0 ? (
        <div className="mv-card p-5 text-center my-4">
          <div className="fs-1 text-secondary mb-2">🩺</div>
          <h5 className="fw-bold text-dark">No Shared Patient Records Available</h5>
          <p className="text-secondary small mb-0">
            Patients must explicitly grant access to their medical records using your doctor username: <code>{user.username}</code>.
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border my-4">
          <div className="fs-3 text-secondary mb-2">🔍</div>
          <h6 className="fw-bold text-secondary">No patient records match your search</h6>
          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="row g-4">
          {filteredRecords.map((rec) => (
            <div key={rec.id} className="col-md-6 col-lg-4">
              <div
                className="mv-card p-4 h-100 d-flex flex-column border-teal shadow-sm-hover"
                style={{ borderColor: '#99f6e4', cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                onClick={() => handleSelectRecord(rec.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectRecord(rec.id)}
                tabIndex={0}
                role="button"
                aria-label={`View record ${rec.title}`}
              >
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className={`badge ${getBadgeClass(rec.record_type)} px-2 py-1 text-uppercase`}>
                    {rec.record_type.replace('_', ' ')}
                  </span>
                  <span className="text-secondary small">{rec.record_date}</span>
                </div>

                <h5 className="fw-bold text-dark mb-1">{rec.title}</h5>

                <p className="text-secondary small mb-2 fw-semibold">
                  👤 Patient: {rec.patient_name || rec.patient_username} ({rec.patient_username})
                </p>

                {rec.provider_name && (
                  <p className="small mb-2 fw-semibold" style={{ color: '#0f766e' }}>
                    🩺 Provider: {rec.provider_name}
                  </p>
                )}

                <p className="text-secondary small flex-grow-1 mb-3 text-truncate">
                  {rec.description || <em className="text-muted">No description provided.</em>}
                </p>

                <div className="pt-3 border-top d-flex justify-content-between align-items-center mt-auto">
                  <span className="btn btn-sm btn-outline-teal px-3 py-1 rounded-3 fw-semibold small" style={{ color: '#0f766e', borderColor: '#0f766e' }}>
                    🔍 View Details
                  </span>
                  <span className="text-muted micro-text" style={{ fontSize: '0.75rem' }}>
                    Record #{rec.id}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Detail Modal */}
      {(selectedRecord || loadingDetail) && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 rounded-4 shadow-lg">
              <div className="modal-header border-0 pb-0" style={{ backgroundColor: '#f0fdf4', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-success px-3 py-2 rounded-pill">
                    🛡️ Authorized Shared Access Verified
                  </span>
                </div>
                <button type="button" className="btn-close" onClick={() => setSelectedRecord(null)}></button>
              </div>

              <div className="modal-body p-4">
                {loadingDetail ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-teal" style={{ color: '#0d9488' }} role="status">
                      <span className="visually-hidden">Verifying detail authorization...</span>
                    </div>
                    <p className="mt-2 text-secondary small">Validating active share permission...</p>
                  </div>
                ) : selectedRecord && (
                  <>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <span className={`badge ${getBadgeClass(selectedRecord.record_type)} px-3 py-2 text-uppercase mb-2`}>
                          {selectedRecord.record_type.replace('_', ' ')}
                        </span>
                        <h3 className="fw-bold text-dark mb-1">{selectedRecord.title}</h3>
                        <p className="fw-semibold text-secondary mb-2">
                          👤 Patient: {selectedRecord.patient_name || selectedRecord.patient_username} ({selectedRecord.patient_username})
                        </p>
                        {selectedRecord.provider_name && (
                          <p className="fw-semibold mb-0" style={{ color: '#0f766e' }}>
                            🩺 Healthcare Provider: {selectedRecord.provider_name}
                          </p>
                        )}
                      </div>
                      <div className="text-end">
                        <span className="badge bg-light text-secondary border px-3 py-2 rounded-3 fs-6">
                          📅 {selectedRecord.record_date}
                        </span>
                        <div className="text-muted small mt-1">Record ID: #{selectedRecord.id}</div>
                      </div>
                    </div>

                    <div className="p-4 bg-light rounded-3 border mb-3">
                      <h6 className="fw-bold text-dark mb-2">Clinical Notes & Description</h6>
                      <p className="text-secondary mb-0 style-preserve-line">
                        {selectedRecord.description || <em className="text-muted">No detailed notes provided for this record.</em>}
                      </p>
                    </div>

                    {selectedRecord.file && (
                      <div className="p-3 bg-white rounded-3 border d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fs-4">📎</span>
                          <div>
                            <div className="fw-semibold small">Attached Document</div>
                            <div className="text-muted micro-text">{selectedRecord.file}</div>
                          </div>
                        </div>
                        <span className="badge bg-secondary">File Attachment Present</span>
                      </div>
                    )}

                    <div className="small text-muted border-top pt-2">
                      Created at: {new Date(selectedRecord.created_at).toLocaleString()}
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="btn btn-secondary px-4 rounded-3"
                  onClick={() => setSelectedRecord(null)}
                >
                  Close Detail View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
