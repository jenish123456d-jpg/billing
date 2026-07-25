import { FiPhone, FiMapPin, FiMail } from 'react-icons/fi';
import './BillHeader.css';

function BillHeader() {
  return (
    <div className="bill-header">
      <div className="bill-header-left">
        <div className="bill-header-info">
          <h1 className="business-name">SHREEJI MOTORS</h1>
          <p className="business-tagline">Complete Vehicle Care & Solutions</p>
        </div>
      </div>
      <div className="bill-header-right">
        <div className="header-contact">
          <FiMapPin className="contact-icon" />
          <span>SY-12, PLOT NO. 48, NR. KAPADIYAWADI, ALTHAN ROAD, MAHOLLA-2, OPP. AGANWADI, BHATAR, SURAT - 395017</span>
        </div>
        <div className="header-contact">
          <FiPhone className="contact-icon" />
          <span>HASMUKH PATEL - 9924843345</span>
          <FiPhone className="contact-icon" />
          <span>SHASHIKANT LAD - 9714316888</span>
        </div>
        <div className="header-contact">
          <FiMail className="contact-icon" />
          <span>autoservice@example.com</span>
        </div>
      </div>
    </div>
  );
}

export default BillHeader;
