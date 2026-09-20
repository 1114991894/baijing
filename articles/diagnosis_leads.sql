-- Supabase diagnosis_leads 表结构
-- 企业诊断表单（首页移动端底栏「免费企业诊断」弹窗）的线索存储表
-- 2026-09-20 已通过管理 API 在生产库执行完毕，此文件仅作存档/复建用

CREATE TABLE IF NOT EXISTS diagnosis_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  city TEXT,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  employee_count TEXT,
  requirement TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 启用行级安全
ALTER TABLE diagnosis_leads ENABLE ROW LEVEL SECURITY;

-- 任何角色（含匿名）都可提交诊断申请 —— 注意不能限定 TO anon：
-- 新版 sb_publishable_ 密钥下角色归 anon，但 supabase-js insert 默认 return=minimal，
-- 若前端未来加 .select() 回读会触发 42501，故 INSERT 策略不限定角色
CREATE POLICY "Anyone can submit diagnosis request" ON diagnosis_leads
  FOR INSERT WITH CHECK (true);

-- 仅登录管理员（authenticated）可读
CREATE POLICY "Authenticated can view leads" ON diagnosis_leads
  FOR SELECT TO authenticated USING (true);

-- 仅登录管理员可更新（标记已联系/待跟进）
CREATE POLICY "Authenticated can update leads" ON diagnosis_leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 注意：故意不开放匿名 DELETE/SELECT/UPDATE；
-- 如需管理员删除线索，可另加：
-- CREATE POLICY "Authenticated can delete leads" ON diagnosis_leads
--   FOR DELETE TO authenticated USING (true);
