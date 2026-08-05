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
          <span>33-A, Shop No. S-9, Ravi Apartment, Opp. Swastik Park, Althan-Bhatar Road, Surat – 395017, Gujarat, India</span>
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
