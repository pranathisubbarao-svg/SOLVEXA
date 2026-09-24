import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  STATUSES,
  formatDate,
  isOpen,
  slug,
  timeAgo,
} from "./adminUtils";

const SERIES_COLOR = "#2563eb";
const GRID_COLOR = "#eef0f4";
const AXIS_COLOR = "#9ca3af";

// Chart tooltip that uses text colors, not the series color
function ChartTooltip({ active, payload, label, unit = "reports" }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="adm-chart-tooltip">
      <span>{label}</span>
      <strong>
        {payload[0].value} {unit}
      </strong>
    </div>
  );
}

function AdminOverview({ stats, complaints, citizens, onOpenReport, onGoTo }) {

  // =====================================
  // REPORTS PER DAY (LAST 30 DAYS)
  // =====================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const timeline = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (29 - index));

    return {
      key: day.toDateString(),
      label: day.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      reports: 0,
    };
  });

  const timelineMap = new Map(timeline.map((day) => [day.key, day]));

  complaints.forEach((complaint) => {
    const key = new Date(complaint.createdAt).toDateString();

    if (timelineMap.has(key)) {
      timelineMap.get(key).reports += 1;
    }
  });

  const reportsLast30 = timeline.reduce((sum, day) => sum + day.reports, 0);

  // =====================================
  // BY CATEGORY
  // =====================================
  const categoryCounts = Object.entries(
    complaints.reduce((counts, complaint) => {
      counts[complaint.category] = (counts[complaint.category] || 0) + 1;
      return counts;
    }, {})
  )
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // =====================================
  // STATUS PIPELINE
  // =====================================
  const statusCounts = STATUSES.map((status) => ({
    status,
    count: complaints.filter((c) => c.status === status).length,
  }));

  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));

  // =====================================
  // LISTS
  // =====================================
  const urgentOpen = complaints
    .filter((c) => isOpen(c) && ["Urgent", "High"].includes(c.priority))
    .slice(0, 5);

  const latest = complaints.slice(0, 5);

  const resolutionRate = stats?.total
    ? Math.round(((stats.resolved + stats.closed) / stats.total) * 100)
    : 0;

  const kpis = [
    {
      label: "Total Reports",
      value: stats?.total ?? 0,
      note: `${reportsLast30} in the last 30 days`,
      tone: "blue",
      icon: "📋",
    },
    {
      label: "Open",
      value: stats?.pending ?? 0,
      note: "Awaiting action",
      tone: "amber",
      icon: "⏳",
      onClick: () => onGoTo("reports", { status: "Open" }),
    },
    {
      label: "Urgent Open",
      value: stats?.urgent ?? 0,
      note: stats?.urgent ? "Needs attention now" : "All clear",
      tone: stats?.urgent ? "red" : "green",
      icon: "🚨",
      onClick: () => onGoTo("reports", { status: "Open", priority: "Urgent" }),
    },
    {
      label: "Unassigned",
      value: stats?.unassigned ?? 0,
      note: stats?.unassigned ? "Open reports with no staff" : "Everything has an owner",
      tone: stats?.unassigned ? "amber" : "green",
      icon: "🧑‍🔧",
      onClick: () => onGoTo("reports", { status: "Open", assignee: "unassigned" }),
    },
    {
      label: "Resolution Rate",
      value: `${resolutionRate}%`,
      note: `${(stats?.resolved ?? 0) + (stats?.closed ?? 0)} resolved or closed`,
      tone: "green",
      icon: "✅",
    },
    {
      label: "Citizens",
      value: stats?.citizens ?? citizens.length,
      note: "Registered accounts",
      tone: "violet",
      icon: "👥",
      onClick: () => onGoTo("citizens"),
    },
  ];

  return (
    <div className="adm-overview">

      {/* KPI Tiles */}
      <div className="adm-kpis">
        {kpis.map((kpi) => {
          const Tag = kpi.onClick ? "button" : "div";

          return (
            <Tag
              key={kpi.label}
              className={`adm-kpi adm-kpi-${kpi.tone} ${kpi.onClick ? "clickable" : ""}`}
              onClick={kpi.onClick}
            >
              <div className="adm-kpi-top">
                <span className="adm-kpi-label">{kpi.label}</span>
                <span className="adm-kpi-icon">{kpi.icon}</span>
              </div>
              <strong className="adm-kpi-value">{kpi.value}</strong>
              <span className="adm-kpi-note">{kpi.note}</span>
            </Tag>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="adm-grid adm-grid-2-1">

        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Reports received</h3>
              <p>New citizen reports per day, last 30 days</p>
            </div>
            <span className="adm-panel-figure">{reportsLast30}</span>
          </div>

          <div className="adm-chart">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={timeline}
                margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="admArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke={GRID_COLOR} vertical={false} />

                <XAxis
                  dataKey="label"
                  tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID_COLOR }}
                  interval={6}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                />

                <Area
                  type="monotone"
                  dataKey="reports"
                  stroke={SERIES_COLOR}
                  strokeWidth={2}
                  fill="url(#admArea)"
                  activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Status pipeline</h3>
              <p>Where every report currently sits</p>
            </div>
          </div>

          <div className="adm-pipeline">
            {statusCounts.map((item) => (
              <button
                key={item.status}
                className="adm-pipeline-row"
                onClick={() => onGoTo("reports", { status: item.status })}
              >
                <span className="adm-pipeline-label">
                  <i className={`adm-dot status-${slug(item.status)}`} />
                  {item.status}
                </span>

                <span className="adm-pipeline-track">
                  <span
                    className="adm-pipeline-fill"
                    style={{ width: `${(item.count / maxStatus) * 100}%` }}
                  />
                </span>

                <span className="adm-pipeline-count">{item.count}</span>
              </button>
            ))}
          </div>
        </section>

      </div>

      {/* Category + Urgent Row */}
      <div className="adm-grid adm-grid-1-1">

        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Reports by category</h3>
              <p>Which problems citizens report most</p>
            </div>
          </div>

          {categoryCounts.length === 0 ? (
            <div className="adm-empty-small">No reports yet</div>
          ) : (
            <div className="adm-chart">
              <ResponsiveContainer
                width="100%"
                height={Math.max(120, categoryCounts.length * 44)}
              >
                <BarChart
                  data={categoryCounts}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                  barCategoryGap={10}
                >
                  <CartesianGrid stroke={GRID_COLOR} horizontal={false} />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: AXIS_COLOR, fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    type="category"
                    dataKey="category"
                    width={140}
                    tick={{ fill: "#374151", fontSize: 13 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#f5f7fb" }}
                  />

                  <Bar
                    dataKey="count"
                    fill={SERIES_COLOR}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                    label={{ position: "right", fill: "#374151", fontSize: 12 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h3>Needs attention</h3>
              <p>Open reports with High or Urgent priority</p>
            </div>
            <button
              className="adm-link"
              onClick={() => onGoTo("reports", { status: "Open" })}
            >
              View all →
            </button>
          </div>

          {urgentOpen.length === 0 ? (
            <div className="adm-empty-small">
              🎉 Nothing urgent right now
            </div>
          ) : (
            <ul className="adm-list">
              {urgentOpen.map((complaint) => (
                <li key={complaint._id}>
                  <button onClick={() => onOpenReport(complaint)}>
                    <span className={`adm-priority adm-priority-${slug(complaint.priority)}`}>
                      {complaint.priority}
                    </span>

                    <span className="adm-list-main">
                      <strong>{complaint.title}</strong>
                      <small>
                        {complaint.complaintNumber} · {complaint.citizenId?.name || "Unknown"} · {timeAgo(complaint.createdAt)}
                      </small>
                    </span>

                    <span className={`adm-status status-${slug(complaint.status)}`}>
                      {complaint.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>

      {/* Latest Reports */}
      <section className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <h3>Latest reports</h3>
            <p>Most recently submitted by citizens</p>
          </div>
          <button className="adm-link" onClick={() => onGoTo("reports")}>
            Open reports →
          </button>
        </div>

        {latest.length === 0 ? (
          <div className="adm-empty-small">No reports yet</div>
        ) : (
          <ul className="adm-list">
            {latest.map((complaint) => (
              <li key={complaint._id}>
                <button onClick={() => onOpenReport(complaint)}>
                  <span className="adm-list-number">
                    {complaint.complaintNumber}
                  </span>

                  <span className="adm-list-main">
                    <strong>{complaint.title}</strong>
                    <small>
                      {complaint.category} · {complaint.citizenId?.name || "Unknown"} · {formatDate(complaint.createdAt)}
                    </small>
                  </span>

                  <span className={`adm-status status-${slug(complaint.status)}`}>
                    {complaint.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

export default AdminOverview;
