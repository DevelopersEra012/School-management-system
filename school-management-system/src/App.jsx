import { useState } from "react";

import Sidebar from "./components/Sidebar.jsx";
import StudentAdmission from "./components/StudentAdmission.jsx";
import StudentDashboard from "./components/StudentDashboard.jsx";

import StudentList from "./components/StudentList.jsx";
import StudentAttendance from "./components/StudentAttendance.jsx";
import SearchDueFees from "./components/Fee-Scructure/SearchDueFees.jsx";
import TeacherList from "./components/Teachers/TeacherList.jsx";
import TeacherAdmission from "./components/Teachers/TeacherAdmission.jsx";
import TeacherDashboard from "./components/Teachers/TeacherDashboard.jsx";
import CollectFee from "./components/Fee-Scructure/CollectFee.jsx";
import FeeDashboard from "./components/Fee-Scructure/FeeDashboard.jsx";
import AllTransactions from "./components/Fee-Scructure/AllTransactions.jsx";
import OnlineTransaction from "./components/Fee-Scructure/OnlineTransaction.jsx";
import FeeChallan from "./components/Fee-Scructure/FeeChallan.jsx";
import AssignFees from "./components/Fee-Scructure/AssignFees.jsx";
import FeeType from "./components/Fee-Scructure/FeeType.jsx";
import FeeGroup from "./components/Fee-Scructure/FeeGroup.jsx";
import FeeSlipHistory from "./components/Fee-Scructure/FeeSlipHistory.jsx";

import "./App.css";

// All pages that have working components.
const implementedViews = [
  "Dashboard",
  "Fee Dashboard",
  "Collect Fee",
  "Search Due Fees",
  "All Transactions",
  "Online Transaction",
  "Fee Challans",
  "Assign Fees",
  "Fee Group",
  "Fee Type",
  "Fee Slip History",
  "Student Admission",
  "Student Dashboard",
  "Student List",
  "Student Attendance",
  "Teacher Dashboard",
  "Teacher Admission",
  "Teacher List"
];

function App() {
  const [activeView, setActiveView] = useState("Dashboard");

  return (
    <div className="erp-layout">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="erp-main">
        {/* Main Dashboard */}
        {activeView === "Dashboard" && (
          <div className="page-content">
            <h1>Dashboard</h1>
            <p>Welcome to your School ERP dashboard.</p>
          </div>
        )}

        {/* Fee and Finance Pages */}
        {activeView === "Fee Dashboard" && <FeeDashboard />}

        {activeView === "Collect Fee" && <CollectFee />}

        {activeView === "Search Due Fees" && <SearchDueFees />}

        {activeView === "All Transactions" && <AllTransactions />}

        {activeView === "Online Transaction" && (
          <OnlineTransaction />
        )}

        {activeView === "Fee Challans" && <FeeChallan />}

        {activeView === "Assign Fees" && <AssignFees />}

        {activeView === "Fee Type" && <FeeType />}

        {activeView === "Fee Group" && <FeeGroup />}

        {activeView === "Fee Slip History" && <FeeSlipHistory />}

        {/* Student Information Pages */}
        {activeView === "Student Admission" && (
          <StudentAdmission />
        )}

        {activeView === "Student Dashboard" && (
          <StudentDashboard />
        )}


         {activeView === "Student Attendance" && (
          <StudentAttendance />
        )}

      

        {activeView === "Student List" && <StudentList />}



        


        {activeView === "Teacher Dashboard" && (
        <TeacherDashboard setActiveView={setActiveView} />
       )}

       

{activeView === "Teacher Admission" && (
  <TeacherAdmission setActiveView={setActiveView} />
)}

{activeView === "Teacher List" && <TeacherList />}

        {/* Show a placeholder only for pages that are not implemented yet. */}
        {!implementedViews.includes(activeView) && (
          <div className="page-content">
            <h1>{activeView}</h1>
            <p>This page is under construction.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;