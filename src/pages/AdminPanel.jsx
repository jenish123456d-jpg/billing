import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiSearch,
  FiEye,
  FiTrash2,
  FiEdit3,
  FiX,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiPrinter,
  FiDollarSign,
  FiShoppingBag,
  FiCheckSquare,
  FiAlertCircle,
} from "react-icons/fi";
import { supabase } from "../supabaseClient";
import "./AdminPanel.css";

function AdminPanel() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPayment, setFilterPayment] = useState("All");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [billToPrint, setBillToPrint] = useState(null);
  const [toast, setToast] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch bills ──
  const fetchBills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bills")
        .select(
          `
          *,
          clients (
            clientName,
            address,
            mobileNumber,
            vehicleNumber,
            vehicleModel,
            engineNumber,
            chassisNumber
          )
        `,
        )
        .order("createdAt", { ascending: false });

      if (error) throw error;

      const flattened = (data || []).map((b) => ({
        ...b,
        clientName: b.clients?.clientName || "",
        address: b.clients?.address || "",
        mobileNumber: b.clients?.mobileNumber || "",
        vehicleNumber: b.clients?.vehicleNumber || "",
        vehicleModel: b.clients?.vehicleModel || "",
        engineNumber: b.clients?.engineNumber || "",
        chassisNumber: b.clients?.chassisNumber || "",
      }));

      setBills(flattened);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch bills. Check Supabase connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // ── Effect to trigger printing ──
  useEffect(() => {
    if (billToPrint) {
      const originalTitle = document.title;
      document.title = billToPrint.clientName
        ? `Invoice - ${billToPrint.clientName}`
        : "Invoice";

      const timer = setTimeout(() => {
        window.print();
        document.title = originalTitle;
        setBillToPrint(null);
      }, 150);

      return () => {
        clearTimeout(timer);
        document.title = originalTitle;
      };
    }
  }, [billToPrint]);

  // ── Delete bill ──
  const handleDelete = async (billId) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;
    try {
      const { error } = await supabase
        .from("bills")
        .delete()
        .eq("billId", billId);

      if (error) throw error;

      showToast("Bill deleted successfully");
      setBills((prev) => prev.filter((b) => b.billId !== billId));
      if (selectedBill?.billId === billId) setSelectedBill(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete bill", "error");
    }
  };

  // ── Update bill (edit) ──
  const handleUpdate = async () => {
    if (!editingBill) return;
    try {
      const {
        billId,
        clientId,
        clientName,
        address,
        mobileNumber,
        vehicleNumber,
        vehicleModel,
        engineNumber,
        chassisNumber,
        kilometer,
        paymentMethod,
      } = editingBill;

      // Update client profile in Supabase
      const { error: clientErr } = await supabase
        .from("clients")
        .update({
          clientName: clientName?.trim(),
          address: address?.trim(),
          mobileNumber: mobileNumber?.trim(),
          vehicleNumber: vehicleNumber?.trim().toUpperCase(),
          vehicleModel: vehicleModel?.trim(),
          engineNumber: engineNumber?.trim(),
          chassisNumber: chassisNumber?.trim(),
        })
        .eq("clientId", clientId);

      if (clientErr) throw clientErr;

      // Update bill properties in Supabase
      const { data: updatedBills, error: billErr } = await supabase
        .from("bills")
        .update({
          kilometer: kilometer?.trim(),
          paymentMethod,
        })
        .eq("billId", billId)
        .select();

      if (billErr) throw billErr;

      if (updatedBills && updatedBills.length > 0) {
        showToast("Bill updated successfully");

        // Re-construct the full flattened bill object to update frontend list state
        const fullyUpdatedBill = {
          ...editingBill,
          ...updatedBills[0],
          clientName,
          address,
          mobileNumber,
          vehicleNumber: vehicleNumber.toUpperCase(),
          vehicleModel,
          engineNumber,
          chassisNumber,
        };

        setBills((prev) =>
          prev.map((b) => (b.billId === billId ? fullyUpdatedBill : b)),
        );
        setEditingBill(null);
        setSelectedBill(fullyUpdatedBill);
      } else {
        showToast("Failed to update bill", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update bill", "error");
    }
  };

  // ── Sorting ──
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <FiChevronUp size={14} />
    ) : (
      <FiChevronDown size={14} />
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.split("T")[0];
  };

  // ── Filter & sort bills ──
  const filteredBills = bills
    .filter((b) => {
      // Search Term Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const cleanTerm = term.replace(/[^a-z0-9]/g, "");
        const cleanVehicle = String(b.vehicleNumber || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        const matchesSearch =
          String(b.billNumber || "")
            .toLowerCase()
            .includes(term) ||
          String(b.clientName || "")
            .toLowerCase()
            .includes(term) ||
          (cleanTerm && cleanVehicle.includes(cleanTerm)) ||
          String(b.vehicleNumber || "")
            .toLowerCase()
            .includes(term) ||
          String(b.mobileNumber || "").includes(term);
        if (!matchesSearch) return false;
      }
      // Payment Method Filter
      if (filterPayment !== "All") {
        console.log("==========>", b.paymentMethod, filterPayment);
        if (b.paymentMethod == "Pending") return false;
      }
      // Start Date Filter
      if (filterStartDate) {
        if (formatDate(b.date) < filterStartDate) return false;
      }
      // End Date Filter
      if (filterEndDate) {
        if (formatDate(b.date) > filterEndDate) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      if (sortField === "totalAmount") {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  // ── Dynamic Dashboard KPI calculations ──
  const totalRevenue = filteredBills.reduce(
    (sum, b) => sum + (parseFloat(b.totalAmount) || 0),
    0,
  );
  const totalCollected = filteredBills
    .filter((b) => b.paymentMethod !== "Pending")
    .reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0);
  const totalUnpaid = filteredBills
    .filter((b) => b.paymentMethod === "Pending")
    .reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0);

  // ── Payment badge color ──
  const getPaymentBadge = (method) => {
    const map = {
      UPI: "badge-info",
      Cash: "badge-success",
      Cheque: "badge-warning",
      Pending: "badge-danger",
    };
    return map[method] || "badge-default";
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Admin Panel</h1>
          <p className="admin-subtitle">{bills.length} bills recorded</p>
        </div>
        <div className="admin-actions">
          <button className="btn-ghost" onClick={fetchBills}>
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {/* ── Dashboard Metrics Cards ── */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue">
            <FiShoppingBag />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Invoices</span>
            <span className="stat-value">{filteredBills.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <FiDollarSign />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">₹{totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper green">
            <FiCheckSquare />
          </div>
          <div className="stat-content">
            <span className="stat-label">Collected</span>
            <span className="stat-value">₹{totalCollected.toFixed(2)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper red">
            <FiAlertCircle />
          </div>
          <div className="stat-content">
            <span className="stat-label">Unpaid / Pending</span>
            <span className="stat-value">₹{totalUnpaid.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      <div className="card admin-filters-card">
        <div className="admin-filters-grid">
          <div className="filter-group search-field">
            <label htmlFor="search-input">Search Records</label>
            <div className="filter-input-wrapper">
              <FiSearch className="filter-icon" />
              <input
                id="search-input"
                type="text"
                placeholder="Search by invoice #, client name, vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group select-field">
            <label htmlFor="payment-select">Payment Type</label>
            <select
              id="payment-select"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option value="All">All Methods</option>
              <option value="Received">Received</option>
              <option value="Pending">Pending</option>
              {/* <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Pending">Pending</option> */}
            </select>
          </div>

          <div className="filter-group date-field">
            <label htmlFor="start-date-input">Start Date</label>
            <input
              id="start-date-input"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group date-field">
            <label htmlFor="end-date-input">End Date</label>
            <input
              id="end-date-input"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>

          <div className="filter-action-group">
            {(searchTerm ||
              filterPayment !== "All" ||
              filterStartDate ||
              filterEndDate) && (
              <button
                className="btn-ghost btn-clear-filters"
                onClick={() => {
                  setSearchTerm("");
                  setFilterPayment("All");
                  setFilterStartDate("");
                  setFilterEndDate("");
                }}
                title="Clear all active filters"
              >
                <FiX /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading bills...</p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="empty-state">
          <p className="empty-text">
            {searchTerm ? "No bills match your search" : "No bills saved yet"}
          </p>
          <p className="empty-hint">
            {searchTerm
              ? "Try a different search term"
              : "Create your first bill from the Billing page"}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="bills-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("billNumber")}>
                  Bill # {renderSortIcon("billNumber")}
                </th>
                <th onClick={() => handleSort("date")}>
                  Date {renderSortIcon("date")}
                </th>
                <th onClick={() => handleSort("clientName")}>
                  Client {renderSortIcon("clientName")}
                </th>
                <th onClick={() => handleSort("vehicleNumber")}>
                  Vehicle No. {renderSortIcon("vehicleNumber")}
                </th>
                <th onClick={() => handleSort("mobileNumber")}>
                  Mobile {renderSortIcon("mobileNumber")}
                </th>
                <th onClick={() => handleSort("totalAmount")}>
                  Total (₹) {renderSortIcon("totalAmount")}
                </th>
                <th onClick={() => handleSort("paymentMethod")}>
                  Payment {renderSortIcon("paymentMethod")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((bill) => (
                <tr key={bill.billId}>
                  <td className="bill-number-cell">{bill.billNumber}</td>
                  <td>{formatDate(bill.date)}</td>
                  <td className="client-name-cell">{bill.clientName}</td>
                  <td>
                    <span className="vehicle-badge">{bill.vehicleNumber}</span>
                  </td>
                  <td>{bill.mobileNumber}</td>
                  <td className="amount-cell">
                    ₹{parseFloat(bill.totalAmount || 0).toFixed(2)}
                  </td>
                  <td>
                    <span
                      className={`payment-badge ${getPaymentBadge(bill.paymentMethod)}`}
                    >
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="action-btn view"
                        onClick={() => setSelectedBill(bill)}
                        title="View details"
                      >
                        <FiEye />
                      </button>
                      <button
                        className="action-btn print"
                        onClick={() => setBillToPrint(bill)}
                        title="Print bill"
                      >
                        <FiPrinter />
                      </button>
                      <button
                        className="action-btn edit"
                        onClick={() => {
                          setEditingBill({ ...bill });
                          setSelectedBill(null);
                        }}
                        title="Edit bill"
                      >
                        <FiEdit3 />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(bill.billId)}
                        title="Delete bill"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── View Detail Modal ── */}
      {selectedBill && (
        <div className="modal-overlay" onClick={() => setSelectedBill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bill Details — {selectedBill.billNumber}</h2>
              <button
                className="modal-close"
                onClick={() => setSelectedBill(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Client Name</span>
                  <span className="detail-value">
                    {selectedBill.clientName}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mobile</span>
                  <span className="detail-value">
                    {selectedBill.mobileNumber}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">
                    {selectedBill.address || "—"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle Number</span>
                  <span className="detail-value">
                    {selectedBill.vehicleNumber}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Vehicle Model</span>
                  <span className="detail-value">
                    {selectedBill.vehicleModel || "—"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Kilometer</span>
                  <span className="detail-value">
                    {selectedBill.kilometer || "—"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Eng. No.</span>
                  <span className="detail-value">
                    {selectedBill.engineNumber || "—"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Ch No</span>
                  <span className="detail-value">
                    {selectedBill.chassisNumber || "—"}
                  </span>
                </div>
                <div className="detail-item" style={{ gridColumn: "span 2" }}>
                  <span className="detail-label" style={{ width: "20%" }}>
                    Date
                  </span>
                  <span className="detail-value" style={{ width: "80%" }}>
                    {formatDate(selectedBill.date)}
                  </span>
                </div>
              </div>

              <h3 className="items-detail-title">Items</h3>
              <table className="items-detail-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Spare Amount</th>
                    <th>Labour</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBill.items || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.itemName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{parseFloat(item.price || 0).toFixed(2)}</td>
                      <td>₹{parseFloat(item.labour || 0).toFixed(2)}</td>
                      <td className="item-total-cell">
                        ₹{parseFloat(item.total || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="modal-total-bar">
                <span>Grand Total</span>
                <span className="modal-total-value">
                  ₹{parseFloat(selectedBill.totalAmount || 0).toFixed(2)}
                </span>
              </div>

              <div
                className="modal-payment-info"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "20px",
                }}
              >
                <div>
                  <span
                    className="detail-label"
                    style={{ marginBottom: "4px" }}
                  >
                    Payment Type
                  </span>
                  <span
                    className={`payment-badge ${getPaymentBadge(selectedBill.paymentMethod)}`}
                  >
                    {selectedBill.paymentMethod}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingBill && (
        <div className="modal-overlay" onClick={() => setEditingBill(null)}>
          <div
            className="modal-content edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Edit Bill — {editingBill.billNumber}</h2>
              <button
                className="modal-close"
                onClick={() => setEditingBill(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="edit-grid">
                <div className="form-group">
                  <label>Client Name</label>
                  <input
                    type="text"
                    value={editingBill.clientName || ""}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        clientName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    value={editingBill.mobileNumber || ""}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        mobileNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={editingBill.address || ""}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        address: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Vehicle Number</label>
                  <input
                    type="text"
                    value={editingBill.vehicleNumber || ""}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        vehicleNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Vehicle Model</label>
                  <input
                    type="text"
                    value={editingBill.vehicleModel || ""}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        vehicleModel: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>KMs.</label>
                  <input
                    type="text"
                    value={editingBill.kilometer || ""}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        kilometer: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Eng. No.</label>
                  <input
                    type="text"
                    value={editingBill.engineNumber || ""}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        engineNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Ch. No.</label>
                  <input
                    type="text"
                    value={editingBill.chassisNumber || ""}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        chassisNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Payment =Type</label>
                  <select
                    value={editingBill.paymentMethod || "Cash"}
                    onChange={(e) =>
                      setEditingBill({
                        ...editingBill,
                        paymentMethod: e.target.value,
                      })
                    }
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="edit-actions">
                <button
                  className="btn-ghost"
                  onClick={() => setEditingBill(null)}
                >
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleUpdate}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      {/* ── Hidden Printable Invoice ── */}
      {billToPrint &&
        createPortal(
          <div id="print-area">
            {/* Header */}
            {/* <div className="bill-header">
            <div className="bill-header-left">
              <div className="bill-header-info">
                <h1 className="business-name">SHREEJI MOTORS</h1>
                <p className="business-tagline">Complete Vehicle Care & Solutions</p>
              </div>
            </div>
            <div className="bill-header-right">
              <div className="header-contact">
                <span>33-A, Shop No. S-9, Ravi Apartment, Opp. Swastik Park, Althan-Bhatar Road, Surat – 395017, Gujarat, India</span>
              </div>
              <div className="header-contact">
                <span>HASMUKH PATEL: +91 99248 43345</span>
              </div>
              <div className="header-contact">
                <span>SHASHIKANT LAD: +91 97143 16888</span>
              </div>
            </div>
          </div> */}

           <div
  style={{
    width: "100%",
    borderBottom: "3px solid #E31E24",
    paddingBottom: "10px",
    fontFamily: "Arial, sans-serif",
  }}
>
  {/* First Line - Logo + Company Name + Mobile */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      width: "100%",
      minHeight: "75px",
    }}
  >
    {/* Logo */}
    <div
      style={{
        width: "120px",
        minWidth: "120px",
        textAlign: "center",
        paddingTop:"50px"
      }}
    >
      <img
        src={"/logo.png"}
        alt="SHREEJI MOTORS"
        style={{
          width: "105px",
          height: "70px",
          objectFit: "contain",
        }}
      />
    </div>

    {/* Company Name */}
    <div
      style={{
        flex: 1,
        textAlign: "left",
        paddingLeft: "10px",
      }}
    >
      <h1
        style={{
          margin: "0",
          padding: "0",
          fontSize: "30px",
          fontWeight: "bold",
          letterSpacing: "1.5px",
          color: "#172B4D",
          lineHeight: "1.2",
        }}
      >
        SHREEJI <span style={{ color: "#E31E24" }}>MOTORS</span>
      </h1>

      <p
        style={{
          margin: "4px 0 0 0",
          fontSize: "11px",
          fontWeight: "bold",
          letterSpacing: "0.5px",
          color: "#555555",
        }}
      >
        Complete Vehicle Care & Solutions
      </p>
    </div>

    {/* Mobile Numbers */}
    <div
      style={{
        width: "210px",
        minWidth: "210px",
        textAlign: "left",
        borderLeft: "2px solid #E31E24",
        paddingLeft: "12px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: "bold",
          color: "#172B4D",
          marginBottom: "6px",
        }}
      >
        HASMUKH PATEL:{" "}
        <span style={{ color: "#E31E24" }}>+91 99248 43345</span>
      </div>

      <div
        style={{
          fontSize: "11px",
          fontWeight: "bold",
          color: "#172B4D",
        }}
      >
        SHASHIKANT LAD:{" "}
        <span style={{ color: "#E31E24" }}>+91 97143 16888</span>
      </div>
    </div>
  </div>

  {/* Second Line - Address starts after Logo */}
  <div
    style={{
      display: "flex",
      width: "100%",
      marginTop: "4px",
    }}
  >
    {/* Empty space equal to Logo width */}
    <div
      style={{
        width: "120px",
        minWidth: "120px",
      }}
    ></div>

    {/* Address */}
    <div
      style={{
        flex: 1,
        paddingLeft: "10px",
        paddingTop: "5px",
        borderTop: "1px solid #D9D9D9",
        fontSize: "9px",
        lineHeight: "1.5  ",
        color: "#444444",
      }}
    >
      <span
        style={{
          fontWeight: "bold",
          color: "#E31E24",
        }}
      >
        ADDRESS:
      </span>{" "}
      33-A, Shop No. S-9, Ravi Apartment, Opp. Swastik Park,
      Althan-Bhatar Road, Surat – 395017, Gujarat, India
    </div>
  </div>
</div>

            {/* Client Details / Metadata Table */}
            <div className="excel-client-section">
              <table className="excel-grid-table">
                <tbody>
                  <tr>
                    <td className="excel-label" style={{ width: "15%" }}>
                      Client Name
                    </td>
                    <td
                      className="excel-value"
                      colSpan="3"
                      style={{ width: "50%" }}
                    >
                      {billToPrint.clientName}
                    </td>
                    <td className="excel-label" style={{ width: "15%" }}>
                      Date
                    </td>
                    <td className="excel-value" style={{ width: "20%" }}>
                      {formatDate(billToPrint.date)}
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-label">Mobile Number</td>
                    <td className="excel-value" style={{ width: "18%" }}>
                      {billToPrint.mobileNumber}
                    </td>
                    <td className="excel-label" style={{ width: "15%" }}>
                      Address
                    </td>
                    <td className="excel-value" colSpan="3">
                      {billToPrint.address || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-label">Vehicle Number</td>
                    <td className="excel-value">{billToPrint.vehicleNumber}</td>
                    <td className="excel-label">Vehicle Model</td>
                    <td className="excel-value">
                      {billToPrint.vehicleModel || "—"}
                    </td>
                    <td className="excel-label">Kilometer</td>
                    <td className="excel-value">
                      {billToPrint.kilometer || "—"}
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-label">Eng. No.</td>
                    <td className="excel-value">
                      {billToPrint.engineNumber || "—"}
                    </td>
                    <td className="excel-label">Ch. No.</td>
                    <td className="excel-value">
                      {billToPrint.chassisNumber || "—"}
                    </td>
                    <td className="excel-label">Payment Type</td>
                    <td className="excel-value" style={{ fontWeight: "bold" }}>
                      {billToPrint.paymentMethod}
                    </td>
                  </tr>
                  <tr>
                    <td className="excel-label" style={{ width: "15%" }}>
                      Invoice No
                    </td>
                    <td className="excel-value" colSpan="5">
                      {billToPrint.billNumber}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Items Table */}
            <div className="excel-items-section">
              <table className="excel-items-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>No.</th>
                    <th>Item Name</th>
                    <th style={{ width: "80px", textAlign: "right" }}>Qty</th>
                    <th style={{ width: "120px", textAlign: "right" }}>
                      Spare Amount
                    </th>
                    <th style={{ width: "120px", textAlign: "right" }}>
                      Labour
                    </th>
                    {/* <th style={{ width: "120px", textAlign: "right" }}>Total (₹)</th> */}
                  </tr>
                </thead>
                <tbody>
                  {(billToPrint.items || []).map((item, index) => (
                    <tr key={index}>
                      <td className="row-number">{index + 1}</td>
                      <td style={{ padding: "6px 8px" }}>{item.itemName}</td>
                      <td className="text-right" style={{ padding: "6px 8px" }}>
                        {item.quantity}
                      </td>
                      <td className="text-right" style={{ padding: "6px 8px" }}>
                        ₹{parseFloat(item.price || 0).toFixed(2)}
                      </td>
                      <td className="text-right" style={{ padding: "6px 8px" }}>
                        ₹{parseFloat(item.labour || 0).toFixed(2)}
                      </td>
                      {/* <td className="item-total-cell text-right" style={{ padding: "6px 8px" }}>
                      ₹{parseFloat(item.total || 0).toFixed(2)}
                    </td> */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Grand Total */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                Total Amount : ₹{" "}
                <span style={{color:'green'}}>{parseFloat(billToPrint.totalAmount || 0).toFixed(2)}{" "} </span>
              </span>
              {/* <span>Payment Type: {billToPrint.paymentMethod}</span> */}
            </div>

            <div style={{ marginTop: "8px" }}>
              Remark:
              ______________________________________________________________________________________________
            </div>

            {/* Print Footer / Signature */}
            <div className="print-footer-simple">
              <div className="terms-conditions-box">
                <p className="terms-title">Terms & Conditions:</p>
                <ol>
                  <li>
                    I hereby authorise the above mentioned jobs to be executed
                    using the required materials. Also that my vehicle will be
                    stored, driven and repaired at my risk.
                  </li>
                  <li>
                    Computer generated copy and use only for the estimate
                    purpose.
                  </li>
                  <li>
                    Please check the vehicle carefully before delivery
                    acceptance. No claims will be accepted after the vehicle has
                    been delivered.
                  </li>
                </ol>
              </div>
              <div className="footer-right-signature">
                <p className="thank-you-msg">Thank you for your business!</p>
                <div className="signature-area-simple">
                  <div className="signature-line-simple"></div>
                  <p>Customer Signature</p>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default AdminPanel;
