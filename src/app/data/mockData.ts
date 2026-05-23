export interface Person {
  id: string;
  name: string;
  title1: string;
  title2?: string;
  title3?: string;
  category: string;
  tags: string[];
  bio: string;
  createdBy: string;
  imageCount: number;
  currentImageIndex: number;
  avatarIndex: number;
  photos?: string[];
  imageOffsetX?: number;
  imageOffsetY?: number;
  imageScale?: number;
}

export const CATEGORIES = [
  "企业家",
  "教育家",
  "公益人士",
  "文化名人",
  "科技精英",
  "艺术创作者",
];

const TAG_POOL = [
  "初心会理事", "教育创新", "扶贫攻坚", "科技赋能", "文化传承",
  "乡村振兴", "青年导师", "公益大使", "创业先锋", "非遗传承",
  "社会企业家", "影响力人物", "智库成员", "志愿者领袖", "品牌创始人",
];

export const mockPeople: Person[] = [
  {
    id: "p001", name: "张明远", avatarIndex: 0,
    category: "企业家",
    title1: "初心教育集团创始人",
    title2: "董事长",
    title3: "战略委员会主席",
    tags: ["初心会理事", "创业先锋", "青年导师", "品牌创始人"],
    bio: "张明远先生深耕教育行业二十余年，以「教育改变命运」为信念，创立初心教育集团，致力于为中西部地区青少年提供优质教育资源。旗下学校覆盖12个省份，累计受益学生逾50万人。",
    createdBy: "管理员", imageCount: 4, currentImageIndex: 0,
  },
  {
    id: "p002", name: "李慧兰", avatarIndex: 1,
    category: "公益人士",
    title1: "慈善基金会理事长",
    title2: "教育公益大使",
    tags: ["公益大使", "扶贫攻坚", "乡村振兴", "初心会理事"],
    bio: "李慧兰女士长期关注乡村教育与女童权益，创立「星光助学基金」，累计资助农村学子逾2.4万人，荣获全国优秀公益人物称号，连续三届入选福布斯中国公益榜。",
    createdBy: "管理员", imageCount: 3, currentImageIndex: 0,
  },
  {
    id: "p003", name: "王建国", avatarIndex: 2,
    category: "科技精英",
    title1: "智链科技创始人",
    title2: "首席执行官",
    title3: "天使投资人",
    tags: ["科技赋能", "创业先锋", "初心会理事", "影响力人物"],
    bio: "王建国先生毕业于清华大学计算机系，先后创立三家科技公司，其中两家成功在纳斯达克上市。专注于人工智能和大数据在教育领域的应用，现担任多家高校客座教授。",
    createdBy: "王明", imageCount: 5, currentImageIndex: 1,
  },
  {
    id: "p004", name: "陈思敏", avatarIndex: 3,
    category: "文化名人",
    title1: "非遗项目发起人",
    title2: "传统文化传播者",
    tags: ["文化传承", "非遗传承", "公益大使"],
    bio: "陈思敏女士深耕传统文化领域，主导整理并传承了包括苗绣、竹编在内的17项非物质文化遗产项目，出版文化著作8部，累计培训传承人逾3000名。",
    createdBy: "管理员", imageCount: 2, currentImageIndex: 0,
  },
  {
    id: "p005", name: "刘子豪", avatarIndex: 4,
    category: "企业家",
    title1: "远航资本创始合伙人",
    title2: "前腾讯副总裁",
    tags: ["初心会理事", "创业先锋", "智库成员"],
    bio: "刘子豪先生曾就职于多家知名互联网企业，创立远航资本后专注早期科技与教育赛道投资，累计投资项目超过80个，管理资产规模逾40亿元。",
    createdBy: "王明", imageCount: 3, currentImageIndex: 0,
  },
  {
    id: "p006", name: "赵雪梅", avatarIndex: 5,
    category: "教育家",
    title1: "北师大附中校长",
    title2: "教育部课程改革专家",
    title3: "全国人大代表",
    tags: ["教育创新", "青年导师", "影响力人物"],
    bio: "赵雪梅校长从教三十年，主持推动多项基础教育改革项目，创立「未来课堂」教学模式，荣获全国优秀教育工作者称号，主持国家级教育科研课题12项。",
    createdBy: "管理员", imageCount: 4, currentImageIndex: 0,
  },
  {
    id: "p007", name: "孙文博", avatarIndex: 6,
    category: "科技精英",
    title1: "深度智能实验室主任",
    title2: "人工智能领域博士生导师",
    tags: ["科技赋能", "智库成员", "青年导师"],
    bio: "孙文博教授是国内顶尖的人工智能研究学者，在自然语言处理和计算机视觉领域发表顶级论文90余篇，获国家科技进步奖，担任多个国际顶会程序委员会委员。",
    createdBy: "管理员", imageCount: 2, currentImageIndex: 0,
  },
  {
    id: "p008", name: "周婷婷", avatarIndex: 7,
    category: "艺术创作者",
    title1: "当代水墨艺术家",
    title2: "中央美术学院客座教授",
    tags: ["文化传承", "影响力人物", "品牌创始人"],
    bio: "周婷婷女士将传统水墨与当代审美融合，作品被多家国际博物馆收藏，曾在纽约、巴黎、东京举办个人画展，荣获亚洲最具影响力设计大奖，长期致力于中国传统美学的国际传播。",
    createdBy: "李芳", imageCount: 6, currentImageIndex: 2,
  },
  {
    id: "p009", name: "吴国栋", avatarIndex: 0,
    category: "公益人士",
    title1: "绿源环保基金会创始人",
    title2: "联合国环境署顾问",
    tags: ["乡村振兴", "扶贫攻坚", "公益大使", "初心会理事"],
    bio: "吴国栋先生积极投身生态保护与可持续发展事业，创立绿源环保基金会，推动西南地区25个自然保护区的管理改革，累计植树造林面积逾120万亩。",
    createdBy: "管理员", imageCount: 3, currentImageIndex: 0,
  },
  {
    id: "p010", name: "郑雅清", avatarIndex: 1,
    category: "文化名人",
    title1: "资深媒体人",
    title2: "知名主持人",
    title3: "文化节目制片人",
    tags: ["文化传承", "影响力人物", "公益大使"],
    bio: "郑雅清女士从事媒体工作二十余年，主持多档收视率破亿的文化类节目，凭借独特的文化视角和温暖的主持风格赢得广泛认可，荣获中国播音主持最高奖「金话筒奖」。",
    createdBy: "管理员", imageCount: 5, currentImageIndex: 1,
  },
  {
    id: "p011", name: "冯浩然", avatarIndex: 2,
    category: "企业家",
    title1: "新创制造集团董事长",
    title2: "全国工商联副主席",
    tags: ["初心会理事", "创业先锋", "智库成员"],
    bio: "冯浩然先生白手起家，将一家小型机械厂发展为年营收逾300亿元的智能制造龙头企业，荣获中国民营企业500强第68位，长期关注职业教育与产教融合。",
    createdBy: "王明", imageCount: 3, currentImageIndex: 0,
  },
  {
    id: "p012", name: "蒋晓琳", avatarIndex: 3,
    category: "教育家",
    title1: "在线教育平台创始人",
    title2: "教育科技领军人物",
    title3: "哈佛访问学者",
    tags: ["教育创新", "创业先锋", "青年导师"],
    bio: "蒋晓琳女士创立的在线教育平台服务用户超3000万，专注于K12优质课程资源普惠化，致力于让偏远地区学生也能享受到最顶尖的教育资源。",
    createdBy: "管理员", imageCount: 4, currentImageIndex: 0,
  },
  {
    id: "p013", name: "何宇轩", avatarIndex: 4,
    category: "科技精英",
    title1: "量子计算研究所所长",
    title2: "国家重点实验室主任",
    tags: ["科技赋能", "智库成员", "影响力人物"],
    bio: "何宇轩教授是国内量子计算领域的奠基性人物之一，主持国家「863计划」多个重大项目，带领团队在量子纠错领域取得突破性成果，荣获国家自然科学一等奖。",
    createdBy: "李芳", imageCount: 2, currentImageIndex: 0,
  },
  {
    id: "p014", name: "林秀珍", avatarIndex: 5,
    category: "艺术创作者",
    title1: "国家一级导演",
    title2: "中国电影导演协会理事",
    tags: ["文化传承", "品牌创始人", "影响力人物"],
    bio: "林秀珍导演作品深植于中国传统文化土壤，多部影片斩获国内外大奖，其纪录片系列《根与魂》在全球50个国家和地区播出，累计观看量逾2亿次。",
    createdBy: "管理员", imageCount: 4, currentImageIndex: 1,
  },
  {
    id: "p015", name: "谢鹏飞", avatarIndex: 6,
    category: "公益人士",
    title1: "乡村振兴项目负责人",
    title2: "希望工程志愿者大使",
    tags: ["乡村振兴", "扶贫攻坚", "志愿者领袖", "公益大使"],
    bio: "谢鹏飞先生放弃城市高薪工作，扎根云贵高原十五年，累计协助建立乡村小学46所，引进产业项目120余个，帮助3.2万名贫困家庭实现稳定增收。",
    createdBy: "管理员", imageCount: 3, currentImageIndex: 0,
  },
  {
    id: "p016", name: "钱佳佳", avatarIndex: 7,
    category: "教育家",
    title1: "特殊教育领域先行者",
    title2: "融合教育推广大使",
    title3: "联合国儿童基金会顾问",
    tags: ["教育创新", "公益大使", "影响力人物"],
    bio: "钱佳佳女士深耕特殊教育领域二十年，创立国内首家融合教育研究中心，推动残障儿童随班就读政策落地，惠及全国逾40万名特殊需求儿童及其家庭。",
    createdBy: "李芳", imageCount: 5, currentImageIndex: 0,
  },
  {
    id: "p017", name: "唐志勇", avatarIndex: 0,
    category: "企业家",
    title1: "绿能源集团总裁",
    title2: "全国政协委员",
    tags: ["初心会理事", "创业先锋", "智库成员"],
    bio: "唐志勇先生深耕清洁能源产业，率领团队攻克多项储能技术难关，旗下集团清洁能源装机容量居全国民营企业第三位，连续荣获「中国绿色企业领袖」称号。",
    createdBy: "王明", imageCount: 3, currentImageIndex: 0,
  },
  {
    id: "p018", name: "袁洁如", avatarIndex: 1,
    category: "文化名人",
    title1: "作家",
    title2: "文化评论家",
    title3: "南京大学人文学院特聘教授",
    tags: ["文化传承", "影响力人物", "青年导师"],
    bio: "袁洁如女士著有长篇小说、散文集及文化评论集共计28部，累计发行量超过800万册，多部作品被译为十余种语言在全球发行，荣获茅盾文学奖提名。",
    createdBy: "管理员", imageCount: 4, currentImageIndex: 2,
  },
  {
    id: "p019", name: "侯俊杰", avatarIndex: 2,
    category: "科技精英",
    title1: "生物医疗科技创始人",
    title2: "精准医疗领域专家",
    tags: ["科技赋能", "创业先锋", "社会企业家"],
    bio: "侯俊杰博士毕业于斯坦福大学医学院，回国创立医疗科技企业，专注于基因检测与个性化医疗，旗下平台服务用户超百万，荣获国家「海外高层次人才引进计划」入选者。",
    createdBy: "李芳", imageCount: 2, currentImageIndex: 0,
  },
  {
    id: "p020", name: "卢明月", avatarIndex: 3,
    category: "艺术创作者",
    title1: "中国民族音乐演奏家",
    title2: "中央音乐学院特聘教授",
    title3: "文化部优秀专家",
    tags: ["文化传承", "非遗传承", "影响力人物"],
    bio: "卢明月女士是享誉国内外的二胡演奏家，师承多位民族音乐大家，曾在维也纳金色大厅、卡内基音乐厅等世界顶级舞台献演，致力于将中国民族音乐推向世界舞台。",
    createdBy: "管理员", imageCount: 6, currentImageIndex: 0,
  },
  {
    id: "p021", name: "方德辉", avatarIndex: 4,
    category: "公益人士",
    title1: "残障人士权益倡导者",
    title2: "中国残疾人联合会理事",
    tags: ["公益大使", "志愿者领袖", "社会企业家"],
    bio: "方德辉先生本身是运动员出身，遭遇意外后转而投身残障事业，创立助残公益平台，帮助数万名残障人士实现稳定就业，积极推动无障碍环境立法，获全国助残先进个人荣誉。",
    createdBy: "管理员", imageCount: 3, currentImageIndex: 0,
  },
  {
    id: "p022", name: "黎诗雨", avatarIndex: 5,
    category: "教育家",
    title1: "国际学校创办人",
    title2: "教育部国际交流专家",
    tags: ["教育创新", "品牌创始人", "青年导师"],
    bio: "黎诗雨女士在海外求学十余年后回国创办双语学校，将中西方教育理念深度融合，培养了一批在全球顶尖高校就读的优秀毕业生，学校屡获「最佳国际化教育创新奖」。",
    createdBy: "王明", imageCount: 4, currentImageIndex: 1,
  },
];

export const avatarGradients = [
  { from: "#FFF4C7", to: "#F4D87A", text: "#8A6500" },
  { from: "#D4ECD4", to: "#A8CEAC", text: "#2A5C2E" },
  { from: "#D4E8F8", to: "#9EC4E4", text: "#1A4870" },
  { from: "#EDD4F4", to: "#CDA4DC", text: "#5A1A78" },
  { from: "#FFD4D4", to: "#F0A8A8", text: "#801A1A" },
  { from: "#D4F4EC", to: "#A0DCCC", text: "#1A5840" },
  { from: "#F4E8D4", to: "#DCC8A0", text: "#6B4010" },
  { from: "#D8D4F4", to: "#B4ACE8", text: "#2A1A80" },
];

export const tagColors = [
  { bg: "#FFF4C7", text: "#8A6500", border: "#F4C542" },
  { bg: "#D4ECD4", text: "#2A5C2E", border: "#A8CEAC" },
  { bg: "#D4E8F8", text: "#1A4870", border: "#9EC4E4" },
  { bg: "#EDD4F4", text: "#5A1A78", border: "#CDA4DC" },
  { bg: "#FFD4D4", text: "#801A1A", border: "#F0A8A8" },
  { bg: "#D4F4EC", text: "#1A5840", border: "#A0DCCC" },
];
