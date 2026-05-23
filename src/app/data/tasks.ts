export type TaskStatus =
  | "等待前置任务"
  | "未开始"
  | "进行中"
  | "待审核"
  | "已完成"
  | "已定稿"
  | "有风险"
  | "已逾期";

export type TaskRole =
  | "招商"
  | "设计"
  | "文案"
  | "短视频"
  | "运营"
  | "客服"
  | "现场执行";

export type TaskPriority = "普通" | "重要" | "紧急";

export type TaskResultType = "图片" | "文案" | "表格" | "视频" | "其他";

export interface DeliveryFeedback {
  id: string;
  title: string;
  note: string;
  materialItemId?: string;
  imageId?: string;
  versionId?: string;
  fromTaskId?: string;
  fromRole?: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string;
}

export interface Task {
  id: string;
  projectId: string;
  taskGroupId?: string;
  role: TaskRole;
  name: string;
  desc?: string;
  owner: string;
  collaborators?: string[];
  deadline: string;
  priority: TaskPriority;
  needUpload: boolean;
  resultType?: TaskResultType;
  needReview: boolean;
  isKey: boolean;
  dependencyIds?: string[];
  linkedTaskIds?: string[];
  status: TaskStatus;
  uploaded: boolean;
  resultContent?: string;
  resultMaterials?: {
    id: string;
    name: string;
    size: string;
    quantity: string;
    scene: string;
    placementImage?: string;
    placementFileName?: string;
    notes: string;
  }[];
  resultLink?: string;
  resultImageUrl?: string;
  resultFileName?: string;
  resultNote?: string;
  deliveryFeedbacks?: DeliveryFeedback[];
  submittedAt?: string;
  reviewedAt?: string;
}

export const TASK_ROLES: TaskRole[] = [
  "招商",
  "设计",
  "文案",
  "短视频",
  "运营",
  "客服",
  "现场执行",
];

export const mockTasks: Task[] = [
  // 众创截拳道 · 2026年5月课程
  { id: "t_001", projectId: "p_jkd_2605", role: "招商", name: "邀约老客户 200 人", owner: "李娜", deadline: "2026-05-20", priority: "紧急", needUpload: true, resultType: "表格", needReview: false, isKey: true, status: "进行中", uploaded: false },
  { id: "t_002", projectId: "p_jkd_2605", role: "招商", name: "异业渠道合作沟通", owner: "王浩", deadline: "2026-05-18", priority: "重要", needUpload: false, needReview: false, isKey: false, status: "进行中", uploaded: false },
  { id: "t_003", projectId: "p_jkd_2605", taskGroupId: "g_poster_001", role: "设计", name: "主海报 v3", owner: "刘洋", deadline: "2026-05-16", priority: "紧急", needUpload: true, resultType: "图片", needReview: true, isKey: true, dependencyIds: ["t_005"], status: "待审核", uploaded: true, resultNote: "按文案定稿完成主视觉设计" },
  { id: "t_004", projectId: "p_jkd_2605", taskGroupId: "g_social_001", role: "设计", name: "朋友圈九宫格", owner: "刘洋", deadline: "2026-05-19", priority: "重要", needUpload: true, resultType: "图片", needReview: true, isKey: false, dependencyIds: ["t_006"], status: "等待前置任务", uploaded: false },
  { id: "t_005", projectId: "p_jkd_2605", taskGroupId: "g_poster_001", role: "文案", name: "公众号推文 · 预热篇", owner: "苏婉", deadline: "2026-05-17", priority: "重要", needUpload: true, resultType: "文案", needReview: true, isKey: false, linkedTaskIds: ["t_003"], status: "待审核", uploaded: true, resultContent: "主标题：把企业经营的底层动作练扎实\n副标题：3 天训练营，拆解增长、团队与成交的关键打法\n行动口号：5 月场限额开放，适合老板与核心管理层参加。", resultNote: "用于主海报和朋友圈预热图" },
  { id: "t_006", projectId: "p_jkd_2605", role: "文案", name: "社群预热文案 7 条", owner: "苏婉", deadline: "2026-05-21", priority: "普通", needUpload: true, resultType: "文案", needReview: false, isKey: false, status: "进行中", uploaded: false },
  { id: "t_007", projectId: "p_jkd_2605", role: "短视频", name: "讲师介绍短视频", owner: "陈默", deadline: "2026-05-15", priority: "紧急", needUpload: true, resultType: "视频", needReview: true, isKey: true, status: "有风险", uploaded: false },
  { id: "t_008", projectId: "p_jkd_2605", role: "运营", name: "整体排期与提醒", owner: "周敏", deadline: "2026-05-30", priority: "重要", needUpload: false, needReview: false, isKey: false, status: "进行中", uploaded: false },
  { id: "t_009", projectId: "p_jkd_2605", role: "客服", name: "报名 FAQ 整理", owner: "邓雪", deadline: "2026-05-18", priority: "普通", needUpload: true, resultType: "文案", needReview: false, isKey: false, status: "已完成", uploaded: true },
  { id: "t_010", projectId: "p_jkd_2605", role: "现场执行", name: "签到台与物料清单", owner: "高峰", deadline: "2026-05-28", priority: "重要", needUpload: true, resultType: "表格", needReview: false, isKey: false, status: "未开始", uploaded: false },
  { id: "t_011", projectId: "p_jkd_2605", role: "现场执行", name: "投影音响测试", owner: "高峰", deadline: "2026-05-30", priority: "紧急", needUpload: false, needReview: false, isKey: true, status: "未开始", uploaded: false },

  // 招商说明会 · 5月场
  { id: "t_101", projectId: "p_zs_05", role: "招商", name: "邀约目标企业 60 家", owner: "李娜", deadline: "2026-05-18", priority: "紧急", needUpload: true, resultType: "表格", needReview: false, isKey: true, status: "进行中", uploaded: false },
  { id: "t_102", projectId: "p_zs_05", role: "设计", name: "招商海报 v2", owner: "刘洋", deadline: "2026-05-15", priority: "紧急", needUpload: true, resultType: "图片", needReview: true, isKey: true, status: "已定稿", uploaded: true },
  { id: "t_103", projectId: "p_zs_05", role: "文案", name: "招商手册定稿", owner: "苏婉", deadline: "2026-05-16", priority: "重要", needUpload: true, resultType: "文案", needReview: true, isKey: true, status: "待审核", uploaded: true },

  // 私董会沙龙 · 6月场
  { id: "t_201", projectId: "p_sdh_06", role: "招商", name: "精英客户初筛名单", owner: "王浩", deadline: "2026-05-25", priority: "重要", needUpload: true, resultType: "表格", needReview: false, isKey: true, status: "有风险", uploaded: false },
  { id: "t_202", projectId: "p_sdh_06", role: "设计", name: "邀请函设计", owner: "刘洋", deadline: "2026-06-01", priority: "重要", needUpload: true, resultType: "图片", needReview: true, isKey: false, status: "未开始", uploaded: false },
  { id: "t_203", projectId: "p_sdh_06", role: "运营", name: "沙龙整体方案制定", owner: "周敏", deadline: "2026-05-22", priority: "紧急", needUpload: true, resultType: "其他", needReview: true, isKey: true, status: "有风险", uploaded: false },

  // 众创截拳道 · 2026年6月课程
  { id: "t_301", projectId: "p_jkd_2606", taskGroupId: "g_jkd_2606_poster", role: "设计", name: "主海报草稿", owner: "刘洋", deadline: "2026-06-05", priority: "普通", needUpload: true, resultType: "图片", needReview: true, isKey: true, dependencyIds: ["t_302"], status: "等待前置任务", uploaded: false },
  { id: "t_302", projectId: "p_jkd_2606", taskGroupId: "g_jkd_2606_poster", role: "文案", name: "招生主文案", owner: "苏婉", deadline: "2026-06-08", priority: "重要", needUpload: true, resultType: "文案", needReview: true, isKey: true, linkedTaskIds: ["t_301"], status: "进行中", uploaded: false },
  { id: "t_303", projectId: "p_jkd_2606", role: "招商", name: "老学员复购沟通", owner: "李娜", deadline: "2026-06-10", priority: "重要", needUpload: false, needReview: false, isKey: false, status: "进行中", uploaded: false },
];
