-- ============================================================
-- 客户提效案例表（首页「客户提效案例」模块 + admin.html 案例管理）
-- 在 Supabase SQL Editor 中执行本文件
-- ============================================================

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_tag TEXT NOT NULL,          -- 行业标签行，如：SOFTWARE · 200 人软件公司
  title TEXT NOT NULL,                 -- 指标名，如：新员工上手周期
  before_val TEXT,                     -- 改善前（显示为删除线），如：12 周
  after_val TEXT,                      -- 改善后（大数字），如：5 周
  delta TEXT,                          -- 徽章文本，如：↓ 58%
  path TEXT,                           -- 改善路径，如：岗位任务重构 → SOP 进工作台 → 8 周数据验证
  summary TEXT,                        -- 案例描述
  note TEXT,                           -- 改善维度，如：岗位效率 · 一次完成率
  sort_order INT DEFAULT 0,            -- 显示顺序（小在前）
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- 匿名可读（前端首页展示）
CREATE POLICY "Cases are publicly readable" ON cases
  FOR SELECT USING (true);

-- 登录用户可增删改（admin 后台）
CREATE POLICY "Authenticated users can insert cases" ON cases
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update cases" ON cases
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete cases" ON cases
  FOR DELETE USING (auth.role() = 'authenticated');

-- updated_at 自动更新（函数若已存在则跳过）
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_updated_at ON cases;
CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 种子数据（与当前首页静态卡片一致，可删可改）
INSERT INTO cases (industry_tag, title, before_val, after_val, delta, path, summary, note, sort_order) VALUES
('SOFTWARE · 200 人软件公司', '新员工上手周期', '12 周', '5 周', '↓ 58%',
 '岗位任务重构 → SOP 进工作台 → 8 周数据验证',
 '实施顾问岗依赖两名老员工，SOP 写了没人用。重构任务清单后 SOP 进入工作台按单执行，新人照单作业，三个月内两批新人全部达标。',
 '改善维度：岗位效率 · 一次完成率', 1),
('MANUFACTURING · 300 人制造企业', '跨部门审批周期', '3.5 天', '1 天', '↓ 71%',
 '决策事项清单 → 授权层级重设 → 例外才上升',
 '订单变更原来要过 5 层审批，管理层深陷日常签核。重设决策清单与授权后，常规事项一线直办，老板每周审批时间从 6 小时降到 40 分钟。',
 '改善维度：组织效率 · 决策周期', 2),
('PROFESSIONAL SERVICE · 120 人服务机构', '人工成本率', '连降两年', '-4.2pct', '人员零净增',
 '人才盘点 → 9 个关键岗调整 → 奖金挂钩毛利',
 '营收增长但利润率连续两年下滑。人才盘点识别错配后调整关键岗，项目奖金与毛利挂钩，第二年承接 30% 业务增长、一名未裁、一名未招。',
 '改善维度：人才效能 · 激励效能', 3);
