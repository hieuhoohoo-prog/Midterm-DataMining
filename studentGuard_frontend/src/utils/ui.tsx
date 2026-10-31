import React from 'react';
import { Tag } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  ExclamationCircleFilled,
  WarningFilled,
} from '@ant-design/icons';

export const STAGE_LABELS: Record<string, string> = {
  enrollment: 'Khi nhập học',
  semester_1: 'Sau Học kỳ 1',
  semester_2: 'Sau Học kỳ 2',
};

export const TARGET_LABELS: Record<string, string> = {
  Graduate: 'Tốt nghiệp (Graduate)',
  Enrolled: 'Đang theo học (Enrolled)',
  Dropout: 'Thôi học (Dropout)',
};

export const TARGET_SHORT_LABELS: Record<string, string> = {
  Graduate: 'Tốt nghiệp',
  Enrolled: 'Đang học',
  Dropout: 'Thôi học',
};

export const GROUP_LABELS: Record<string, string> = {
  personal: 'Thông tin cá nhân & Nhân khẩu học',
  family: 'Gia đình & Nền tảng phụ huynh',
  admission: 'Tuyển sinh & Trình độ đầu vào',
  financial: 'Tài chính & Học bổng',
  macro: 'Chỉ số Kinh tế Vĩ mô',
  semester_1: 'Kết quả Học tập – Học kỳ 1',
  semester_2: 'Kết quả Học tập – Học kỳ 2',
};

export const renderTargetTag = (target?: string | null) => {
  if (!target) return <Tag>Chưa xác định</Tag>;
  if (target === 'Graduate') {
    return (
      <Tag icon={<CheckCircleFilled />} color="success" style={{ fontWeight: 500 }}>
        Tốt nghiệp
      </Tag>
    );
  }
  if (target === 'Enrolled') {
    return (
      <Tag icon={<ClockCircleFilled />} color="processing" style={{ fontWeight: 500 }}>
        Đang học
      </Tag>
    );
  }
  if (target === 'Dropout') {
    return (
      <Tag icon={<ExclamationCircleFilled />} color="error" style={{ fontWeight: 500 }}>
        Thôi học
      </Tag>
    );
  }
  return <Tag>{target}</Tag>;
};

export const renderRiskTag = (level?: string | null, score?: number | null) => {
  if (!level) {
    return <Tag color="default">Chưa đánh giá</Tag>;
  }
  const pct = score != null ? ` (${Math.round(score * 100)}%)` : '';
  if (level === 'High') {
    return (
      <Tag icon={<ExclamationCircleFilled />} color="#dc2626" style={{ fontWeight: 600 }}>
        Nguy cơ Cao{pct}
      </Tag>
    );
  }
  if (level === 'Medium') {
    return (
      <Tag icon={<WarningFilled />} color="#d97706" style={{ fontWeight: 600 }}>
        Nguy cơ Vừa{pct}
      </Tag>
    );
  }
  return (
    <Tag icon={<CheckCircleFilled />} color="#16a34a" style={{ fontWeight: 600 }}>
      Nguy cơ Thấp{pct}
    </Tag>
  );
};

export const RiskGauge: React.FC<{ score: number; level: string }> = ({ score, level }) => {
  const clamped = Math.max(0, Math.min(1, score));
  const pct = Math.round(clamped * 100);
  const color =
    level === 'High' ? '#dc2626' : level === 'Medium' ? '#d97706' : '#16a34a';
  const label =
    level === 'High'
      ? 'Cần can thiệp học vụ ngay'
      : level === 'Medium'
      ? 'Cần theo dõi & nhắc nhở'
      : 'Tiến độ học tập ổn định';

  // Semi-circle SVG arc calculation
  const radius = 78;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <svg width="210" height="125" viewBox="0 0 210 125">
        <path
          d="M 27 105 A 78 78 0 0 1 183 105"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 27 105 A 78 78 0 0 1 183 105"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
        <text
          x="105"
          y="85"
          textAnchor="middle"
          style={{ fontSize: 32, fontWeight: 700, fill: '#0f172a' }}
        >
          {pct}%
        </text>
        <text
          x="105"
          y="108"
          textAnchor="middle"
          style={{ fontSize: 12, fontWeight: 600, fill: color }}
        >
           Điểm rủi ro: {score.toFixed(2)}
        </text>
      </svg>
      <div style={{ marginTop: 4 }}>{renderRiskTag(level)}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  );
};

