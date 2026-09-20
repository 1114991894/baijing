-- 企业诊断线索表（首页移动端「免费企业诊断」表单收集）
-- 首次使用：在 Supabase Dashboard → SQL Editor 中执行本文件

CREATE TABLE IF NOT EXISTS diagnosis_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,              -- 公司名称
  city TEXT,                          -- 城市
  contact_name TEXT NOT NULL,         -- 联系人
  phone TEXT NOT NULL,                -- 手机号
  employee_count TEXT,                -- 员工数（区间文本）
  requirement TEXT,                   -- 需求描述
  status TEXT DEFAULT 'new',          -- new=待跟进 / contacted=已联系
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 开启行级安全
ALTER TABLE diagnosis_leads ENABLE ROW LEVEL SECURITY;

-- 允许匿名提交（访客填表）
CREATE POLICY "Anyone can submit diagnosis request"
  ON diagnosis_leads FOR INSERT TO anon WITH CHECK (true);

-- 登录用户（管理后台）可查看
CREATE POLICY "Authenticated can view leads"
  ON diagnosis_leads FOR SELECT TO authenticated USING (true);

-- 登录用户可更新状态（标记已联系）
CREATE POLICY "Authenticated can update leads"
  ON diagnosis_leads FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_diagnosis_leads_created_at
  ON diagnosis_leads (created_at DESC);
