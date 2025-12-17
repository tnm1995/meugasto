
import React from 'react';

interface IconProps {
  className?: string;
}

const MaterialIcon: React.FC<{ iconName: string; className?: string }> = ({ iconName, className }) => (
    <span className={`material-symbols-outlined ${className}`}>
        {iconName}
    </span>
);

export const DashboardIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="space_dashboard" className={className} />;
export const ListIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="receipt_long" className={className} />;
export const ChartIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="bar_chart" className={className} />;
export const ProfileIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="account_circle" className={className} />;
export const PlusIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="add" className={className} />;
export const CameraIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="photo_camera" className={className} />;
export const XMarkIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="close" className={className} />;
export const TrashIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="delete" className={className} />;
export const SavingsIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="savings" className={className} />;
export const WalletIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="wallet" className={className} />;
export const ReceiptIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="receipt" className={className} />;
export const CategoryIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="category" className={className} />;
export const CheckIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="check" className={className} />;

// Icons for Reports Screen
export const PaymentsIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="payments" className={className} />;
export const CalculateIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="calculate" className={className} />;
export const NorthEastIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="north_east" className={className} />;
export const PieChartIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="pie_chart" className={className} />;
export const ShowChartIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="show_chart" className={className} />;
export const ListAltIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="list_alt" className={className} />;

// Icons for Savings Screen
export const TodayIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="today" className={className} />;
export const DateRangeIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="date_range" className={className} />;
export const CalendarTodayIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="calendar_today" className={className} />;

// Icons for Profile Screen
export const PremiumIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="workspace_premium" className={className} />;
export const NotificationsIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="notifications" className={className} />;
export const ChevronRightIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="chevron_right" className={className} />;
export const CheckCircleIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="check_circle" className={className} />;
export const LogoutIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="logout" className={className} />;

// Icons for Landing Page
export const ShieldCheckIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="verified_user" className={className} />;
export const SparklesIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="auto_awesome" className={className} />;
export const TrendingUpIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="trending_up" className={className} />;
export const TargetIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="track_changes" className={className} />;

// New Icons for Filters/Budget/Edit
export const FilterListIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="filter_list" className={className} />;
export const SearchIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="search" className={className} />;
export const EditIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="edit" className={className} />;
export const MoneyOffIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="money_off" className={className} />;
export const AttachMoneyIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="attach_money" className={className} />;
export const DownloadIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="download" className={className} />;
export const MoreVertIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="more_vert" className={className} />;

// New Icons for Profile (Privacy, Terms, Support)
export const PolicyIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="policy" className={className} />;
export const DescriptionIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="description" className={className} />;
export const SupportAgentIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="support_agent" className={className} />;

// Admin Panel Icons
export const AdminPanelSettingsIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="admin_panel_settings" className={className} />;
export const GroupIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="group" className={className} />;
export const LockIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="lock" className={className} />;
export const LockOpenIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="lock_open" className={className} />;
export const CalendarClockIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="calendar_clock" className={className} />;
export const EmailIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="mail" className={className} />;
export const KeyIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="key" className={className} />;
export const HistoryIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="history" className={className} />;

// Install Prompt Icons
export const IosShareIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="ios_share" className={className} />;
export const InstallMobileIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="install_mobile" className={className} />;

// Visibility Icons
export const VisibilityIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="visibility" className={className} />;
export const VisibilityOffIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="visibility_off" className={className} />;
export const ArrowForwardIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="arrow_forward" className={className} />;

// Gamification Icons
export const TrophyIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="emoji_events" className={className} />;
export const StarIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="star" className={className} />;
export const MilitaryTechIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="military_tech" className={className} />;
export const BoltIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="bolt" className={className} />;

// Support Chat Icons
export const ChatBubbleIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="chat_bubble" className={className} />;
export const SendIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="send" className={className} />;
export const PaperClipIcon: React.FC<IconProps> = ({ className }) => <MaterialIcon iconName="attach_file" className={className} />;
