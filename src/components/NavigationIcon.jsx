import {
  House, LayoutDashboard, Tickets, TicketPlus, Headset,
  ChartNoAxesCombined, ContactRound, UsersRound, CalendarClock,
  TriangleAlert, Tags,
} from "lucide-react";

const NAVIGATION_ICONS = {
  home: House,
  dashboard: LayoutDashboard,
  tickets: Tickets,
  createTicket: TicketPlus,
  serviceDesk: Headset,
  reports: ChartNoAxesCombined,
  profile: ContactRound,
  users: UsersRound,
  events: CalendarClock,
  notices: TriangleAlert,
  catalog: Tags,
};

export default function NavigationIcon({ name }) {
  const Glyph = NAVIGATION_ICONS[name];
  return <Glyph className="icon" size={20} strokeWidth={1.7} aria-hidden="true" />;
}
