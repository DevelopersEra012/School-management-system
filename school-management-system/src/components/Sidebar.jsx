import { useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  BookOpen,
  Users,
  ChevronDown,
  ChevronRight,
  Receipt,
  CreditCard,
  UserPlus,
  UserRound,
  Menu,
  ClipboardCheck,
  School,
  GraduationCap,
} from "lucide-react";

import "./Sidebar.css";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Fee and Finance",
    icon: Wallet,
    children: [
      { title: "Fee Dashboard", icon: LayoutDashboard },
      { title: "Collect Fee", icon: Receipt },
      { title: "Search Due Fees", icon: CreditCard },
      { title: "All Transactions", icon: Receipt },
      { title: "Online Transaction", icon: CreditCard },
      { title: "Fee Challans", icon: Receipt },
      { title: "Assign Fees", icon: UserPlus },
      { title: "Fee Group", icon: BookOpen },
      { title: "Fee Type", icon: Wallet },
      { title: "Fee Slip History", icon: Receipt },
    ],
  },
  {
    title: "Accounts",
    icon: BookOpen,
    children: [
      { title: "Accounts Dashboard", icon: LayoutDashboard },
      { title: "Income", icon: Wallet },
      { title: "Expense", icon: CreditCard },
      { title: "Income Heads", icon: BookOpen },
      { title: "Expense Heads", icon: BookOpen },
      { title: "Bank Accounts", icon: Wallet },
    ],
  },
  {
    title: "Student Information",
    icon: Users,
    children: [
      { title: "Student Dashboard", icon: LayoutDashboard },
      { title: "Student Admission", icon: UserPlus },
      { title: "Student List", icon: UserRound },
      { title: "Student Attendance", icon: ClipboardCheck },
    ],
  },
  {
    title: "Teacher Information",
    icon: GraduationCap,
    children: [
      { title: "Teacher Dashboard", icon: LayoutDashboard },
      { title: "Teacher Admission", icon: UserPlus },
      { title: "Teacher List", icon: Users },
    ],
  },
];

export default function Sidebar({ activeView, setActiveView }) {
  const [openMenu, setOpenMenu] = useState("Student Information");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="brand">
          <School size={28} />
          {!collapsed && <span>School ERP</span>}
        </div>

        <button
          type="button"
          className="toggle-btn"
          onClick={() => setCollapsed((previous) => !previous)}
          aria-label="Toggle sidebar"
        >
          <Menu size={21} />
        </button>
      </div>

      <div className="sidebar-label">
        {!collapsed && "MAIN MENU"}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isOpen = openMenu === item.title;
          const isParentActive =
            item.title === activeView ||
            item.children?.some((child) => child.title === activeView);

          return (
            <div className="menu-group" key={item.title}>
              <button
                type="button"
                className={`menu-item ${isParentActive ? "active" : ""}`}
                title={collapsed ? item.title : ""}
                onClick={() => {
                  if (item.children) {
                    setOpenMenu(isOpen ? "" : item.title);
                  } else {
                    setActiveView(item.title);
                  }
                }}
              >
                <Icon size={20} />

                {!collapsed && (
                  <>
                    <span>{item.title}</span>

                    {item.children &&
                      (isOpen ? (
                        <ChevronDown className="menu-arrow" size={17} />
                      ) : (
                        <ChevronRight className="menu-arrow" size={17} />
                      ))}
                  </>
                )}
              </button>

              {item.children && isOpen && !collapsed && (
                <div className="submenu">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = activeView === child.title;

                    return (
                      <button
                        type="button"
                        className={`submenu-item ${
                          isChildActive ? "active" : ""
                        }`}
                        key={child.title}
                        title={child.title}
                        onClick={() => setActiveView(child.title)}
                      >
                        <ChildIcon size={17} />
                        <span>{child.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="profile-avatar">A</div>
          <div>
            <strong>Admin User</strong>
            <small>Administrator</small>
          </div>
        </div>
      )}
    </aside>
  );
}
