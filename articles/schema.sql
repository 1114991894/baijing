-- Supabase Articles Table Schema
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  author TEXT DEFAULT '百鲸咨询',
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  featured BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for frontend display)
CREATE POLICY "Articles are publicly readable" ON articles
  FOR SELECT USING (true);

-- Allow authenticated insert (for admin)
CREATE POLICY "Authenticated users can insert articles" ON articles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated update (for admin)
CREATE POLICY "Authenticated users can update articles" ON articles
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated delete (for admin)
CREATE POLICY "Authenticated users can delete articles" ON articles
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert sample data
INSERT INTO articles (title, excerpt, content, author, featured) VALUES
  ('企业战略规划的核心要素', '探索企业战略规划中的关键要素和实用方法', '企业战略规划是企业发展的指南针。在当前快速变化的商业环境中，企业需要明确自身的核心竞争力，制定切实可行的发展战略。本文将从市场分析、竞争定位、资源配置、执行落地四个方面，深入探讨企业战略规划的核心要素，帮助企业管理者理清思路，把握方向。', '百鲸咨询', true),
  ('股权激励设计的五大原则', '了解股权激励设计必须遵循的五大核心原则', '股权激励是绑定核心人才与企业利益的重要工具。合理的股权激励设计不仅能激发员工的积极性，还能有效降低人才流失率。本文总结了股权激励设计的五大原则：战略导向、动态调整、公平公正、业绩挂钩、退出机制，帮助企业构建科学的激励体系。', '百鲸咨询', true),
  ('数字化转型如何落地', '从理论到实践，全面解析企业数字化转型的落地路径', '数字化转型已经成为企业发展的必由之路。然而，许多企业在转型过程中面临着技术、组织、文化等多重挑战。本文将从顶层设计、技术选型、组织变革、人才建设四个维度，全面解析企业数字化转型的落地路径。', '百鲸咨询', true),
  ('组织架构优化的关键步骤', '掌握组织架构优化的核心方法论', '组织架构是企业运行的骨架。一个高效的组织架构能够明确各部门职责，提升协同效率，降低管理成本。本文将详细介绍组织架构优化的关键步骤：现状诊断、目标设定、结构设计、流程优化、配套机制，帮助企业构建敏捷高效的组织体系。', '百鲸咨询', true),
  ('薪酬体系设计的底层逻辑', '深入理解薪酬体系设计的核心逻辑', '薪酬体系是企业吸引、激励和保留人才的核心工具。一个科学合理的薪酬体系需要兼顾内部公平性和外部竞争力。本文将从岗位价值评估、薪酬结构设计、绩效考核挂钩、市场对标四个层面，深入剖析薪酬体系设计的底层逻辑。', '百鲸咨询', true),
  ('合伙模式的设计与实践', '探索适合中国企业的合伙模式', '合伙模式是企业整合资源、激发活力的重要方式。从普通合伙到有限合伙，从事业合伙到平台合伙，不同的模式适用于不同的发展阶段。本文将结合中国企业的实际情况，探讨合伙模式的设计思路和实践路径。', '百鲸咨询', true),
  ('AI在企业管理中的应用', '人工智能如何赋能企业管理升级', '随着AI技术的快速发展，越来越多的企业开始关注AI在管理中的应用。从智能客服到数据分析，从流程自动化到决策支持，AI正在深刻改变企业的运营方式。本文将介绍AI在企业管理中的主要应用场景和实施路径。', '百鲸咨询', true),
  ('绩效考核体系搭建指南', '构建以结果为导向的绩效考核体系', '绩效考核是企业管理的重要抓手。一个有效的绩效考核体系能够将战略目标层层分解，转化为可量化的指标，驱动组织和个人的持续改进。本文将提供绩效考核体系搭建的完整指南，包括指标设计、考核流程、结果应用等关键环节。', '百鲸咨询', false),
  ('中小企业合规经营指南', '帮助中小企业规避经营风险', '合规经营是企业可持续发展的基石。许多中小企业在成长过程中因为忽视合规而面临法律风险和经济损失。本文将从合同管理、税务合规、劳动法务、知识产权四个维度，为中小企业提供合规经营的实用指南。', '百鲸咨询', false),
  ('企业文化建设的方法论', '打造有凝聚力的企业组织文化', '企业文化是企业的灵魂。一个优秀的企业文化能够增强团队凝聚力，提升员工归属感，塑造品牌形象。本文将分享企业文化建设的方法论，包括文化诊断、核心价值观提炼、行为规范落地、文化传播等关键步骤。', '百鲸咨询', false),
);