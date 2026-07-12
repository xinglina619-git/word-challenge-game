const makeGradedWords = text => text.trim().split(';').map(entry => {
  const [word, zh, icon = '✦'] = entry.split('|');
  return { word, zh, icon, phonetic: '', wrong: [] };
});

window.GAME_CONTENT = {
  starter: [
    { word: 'apple', zh: '苹果', icon: '🍎', phonetic: '/ˈæpəl/', wrong: ['香蕉', '小猫'] },
    { word: 'cat', zh: '小猫', icon: '🐱', phonetic: '/kæt/', wrong: ['小狗', '小鸟'] },
    { word: 'bag', zh: '书包', icon: '🎒', phonetic: '/bæɡ/', wrong: ['帽子', '尺子'] },
    { word: 'red', zh: '红色', icon: '🔴', phonetic: '/red/', wrong: ['蓝色', '黄色'] },
    { word: 'dog', zh: '小狗', icon: '🐶', phonetic: '/dɒɡ/', wrong: ['小马', '小鱼'] },
    { word: 'book', zh: '书', icon: '📘', phonetic: '/bʊk/', wrong: ['铅笔', '椅子'] },
    { word: 'pen', zh: '钢笔', icon: '🖊️', phonetic: '/pen/', wrong: ['橡皮', '桌子'] },
    { word: 'blue', zh: '蓝色', icon: '🔵', phonetic: '/bluː/', wrong: ['红色', '绿色'] }
  ],
  gradedMain: {
    1: makeGradedWords(`
hello|你好|👋;hi|嗨|👋;goodbye|再见|👋;please|请;thanks|谢谢;yes|是的;no|不是;sorry|对不起;
I|我;you|你;he|他;she|她;we|我们;they|他们;my|我的;your|你的;
one|一;two|二;three|三;four|四;five|五;six|六;seven|七;eight|八;nine|九;ten|十;
red|红色|🔴;yellow|黄色|🟡;green|绿色|🟢;blue|蓝色|🔵;black|黑色;white|白色;orange|橙色;pink|粉色;
father|爸爸;mother|妈妈;brother|兄弟;sister|姐妹;family|家庭;friend|朋友;teacher|老师;student|学生;
school|学校;class|班级;book|书|📘;pen|钢笔|🖊️;pencil|铅笔;eraser|橡皮;ruler|尺子;bag|书包|🎒;
eye|眼睛;ear|耳朵;nose|鼻子;mouth|嘴巴;hand|手;head|头;face|脸;foot|脚;
cat|猫|🐱;dog|狗|🐶;bird|鸟;fish|鱼;rabbit|兔子;duck|鸭子;panda|熊猫;tiger|老虎
`),
    2: makeGradedWords(`
eleven|十一;twelve|十二;thirteen|十三;fourteen|十四;fifteen|十五;sixteen|十六;seventeen|十七;eighteen|十八;
Monday|星期一;Tuesday|星期二;Wednesday|星期三;Thursday|星期四;Friday|星期五;Saturday|星期六;Sunday|星期日;week|星期;
sunny|晴朗的;cloudy|多云的;rainy|下雨的;windy|多风的;snowy|下雪的;hot|炎热的;cold|寒冷的;warm|温暖的;
spring|春天;summer|夏天;autumn|秋天;winter|冬天;morning|早晨;afternoon|下午;evening|傍晚;night|夜晚;
home|家;room|房间;bed|床;door|门;window|窗户;table|桌子;chair|椅子;clock|时钟;
run|跑;walk|走;jump|跳;swim|游泳;sing|唱歌;dance|跳舞;read|阅读;write|写;
eat|吃;drink|喝;sleep|睡觉;play|玩;look|看;listen|听;speak|说;open|打开;
big|大的;small|小的;long|长的;short|短的;old|年老的;young|年轻的;happy|开心的;sad|难过的;
apple|苹果|🍎;banana|香蕉;pear|梨;grape|葡萄;milk|牛奶;bread|面包;rice|米饭;egg|鸡蛋
`),
    3: makeGradedWords(`
Chinese|语文;English|英语;maths|数学;music|音乐;art|美术;science|科学;PE|体育;lesson|课程;
hour|小时;minute|分钟;today|今天;yesterday|昨天;tomorrow|明天;early|早的;late|迟的;time|时间;
football|足球;basketball|篮球;table tennis|乒乓球;badminton|羽毛球;skipping|跳绳;drawing|画画;reading|阅读;shopping|购物;
park|公园;zoo|动物园;library|图书馆;hospital|医院;station|车站;cinema|电影院;shop|商店;farm|农场;
bus|公共汽车;car|小汽车;train|火车;plane|飞机;ship|轮船;bike|自行车;boat|小船;taxi|出租车;
doctor|医生;nurse|护士;driver|司机;farmer|农民;worker|工人;policeman|警察;cook|厨师;pilot|飞行员;
strong|强壮的;thin|瘦的;tall|高的;clever|聪明的;kind|友善的;beautiful|美丽的;busy|忙碌的;quiet|安静的;
river|河流;lake|湖泊;mountain|山;forest|森林;flower|花;tree|树;grass|草;sky|天空;
breakfast|早餐;lunch|午餐;dinner|晚餐;chicken|鸡肉;vegetable|蔬菜;fruit|水果;water|水;juice|果汁
`),
    5: makeGradedWords(`
country|国家;capital|首都;language|语言;culture|文化;history|历史;museum|博物馆;building|建筑;bridge|桥;
travel|旅行;visit|参观;arrive|到达;leave|离开;carry|携带;invite|邀请;prepare|准备;decide|决定;
exercise|锻炼;healthy|健康的;ill|生病的;fever|发烧;cough|咳嗽;medicine|药;rest|休息;energy|能量;
internet|互联网;computer|电脑;keyboard|键盘;screen|屏幕;message|信息;email|电子邮件;website|网站;video|视频;
dangerous|危险的;safe|安全的;important|重要的;different|不同的;special|特别的;popular|受欢迎的;famous|著名的;useful|有用的;
always|总是;usually|通常;often|经常;sometimes|有时;never|从不;already|已经;together|一起;alone|独自;
before|在……以前;after|在……以后;during|在……期间;between|在……之间;across|穿过;through|通过;around|围绕;along|沿着;
protect|保护;save|节约;recycle|回收;plant|种植;clean|清理;waste|浪费;environment|环境;earth|地球;
question|问题;answer|答案;example|例子;idea|主意;reason|原因;problem|难题;plan|计划;future|未来
`),
    6: makeGradedWords(`
achieve|实现;improve|提高;continue|继续;discover|发现;explain|解释;remember|记住;understand|理解;believe|相信;
success|成功;challenge|挑战;experience|经历;knowledge|知识;information|信息;advice|建议;chance|机会;goal|目标;
possible|可能的;impossible|不可能的;excellent|优秀的;careful|仔细的;confident|自信的;independent|独立的;patient|有耐心的;responsible|负责任的;
probably|很可能;especially|尤其;finally|最终;immediately|立即;carefully|仔细地;clearly|清楚地;quickly|迅速地;quietly|安静地;
although|虽然;because|因为;however|然而;therefore|因此;unless|除非;while|当……时候;if|如果;whether|是否;
communication|交流;education|教育;technology|科技;invention|发明;research|研究;project|项目;competition|比赛;teamwork|合作;
volunteer|志愿者;community|社区;service|服务;charity|慈善;respect|尊重;honesty|诚实;courage|勇气;peace|和平;
ocean|海洋;island|岛屿;desert|沙漠;climate|气候;natural|自然的;wildlife|野生动物;pollution|污染;resource|资源;
graduate|毕业;career|职业;dream|梦想;choice|选择;habit|习惯;progress|进步;memory|记忆;journey|旅程
`)
  },
  grade4Book: {
    publisher: '教育科学出版社',
    title: '英语四年级下册',
    units: [
      { id: 1, title: 'The School Garden', scene: '校园花园', words: [
        ['sun','太阳'],['strong','强烈的；强壮的'],['wind','风'],['fruit','水果'],['thin','薄的；瘦的'],['tall','高大的'],
        ['grass','草'],['vegetable','蔬菜'],['grow','种植；生长'],['carrot','胡萝卜'],['fresh','新鲜的；清新的'],['bamboo','竹子'],
        ['winter','冬季'],['summer','夏季'],['apple','苹果'],['umbrella','雨伞'],['delicious','美味的'],['live','存活；居住'],
        ['easy','容易的；轻松的'],['star','星星'],['rose','玫瑰'],['those','那些']
      ]},
      { id: 2, title: 'Busy as a Bee', scene: '蜜糖蜂巢丛林', words: [
        ['clever','聪明的'],['as','如同；作为'],['fox','狐狸'],['mouse','老鼠'],['busy','忙碌的'],['bee','蜜蜂'],['slow','慢的'],
        ['honey','蜂蜜'],['someone','某人'],['brother','兄弟'],['room','房间；空间'],['say','说'],['fast','快的；迅速的'],
        ['still','仍然'],['hungry','饥饿的'],['rain','下雨；雨'],['cat','猫'],['dog','狗'],['black','黑色的'],['sheep','羊'],
        ['dark','深色的；黑暗的'],['duck','鸭子'],['cute','可爱的'],['pig','猪']
      ]},
      { id: 3, title: 'Grow Taller', scene: '成长果园', words: [
        ['milk','牛奶'],['meat','肉'],['egg','鸡蛋'],['chicken','鸡肉'],['healthy','健康的'],['enough','足够的；充足的'],
        ['parent','父亲或母亲'],['often','经常'],['short','矮的；短的'],['candy','糖果'],['ice cream','冰淇淋'],
        ['banana','香蕉'],['second','第二；秒'],['third','第三']
      ]},
      { id: 4, title: "Let's Do It!", scene: '运动列车站', words: [
        ['basketball','篮球；篮球运动'],['ping-pong','乒乓'],['month','月；月份'],['Tuesday','星期二'],['Wednesday','星期三'],
        ['Thursday','星期四'],['Friday','星期五'],['start','开始'],['by','通过；在旁边'],['train','训练；火车'],
        ['catch','赶上；抓住'],['tired','疲倦的'],['everything','一切；所有事物'],['less','更少；较少']
      ]},
      { id: 5, title: "How's the Weather?", scene: '天气峡谷', words: [
        ['windy','多风的'],['town','城镇；城区'],['spring','春天'],['kite','风筝'],['autumn','秋季'],['beach','海滩；沙滩'],
        ['season','季节'],['Australia','澳大利亚'],['September','九月'],['December','十二月'],['February','二月'],
        ['March','三月'],['June','六月'],['August','八月'],['China','中国'],['London','伦敦'],['which','哪些；哪一个']
      ]},
      { id: 6, title: 'Tidy Up My Closet', scene: '魔法衣橱城', words: [
        ['shirt','衬衫'],['jacket','夹克；短外套'],['hang','悬挂'],['trousers','裤子；长裤'],['sweater','毛衣'],['coat','外套；大衣'],
        ['pink','粉色的'],['clothes','衣服'],['group','组；群'],['tidy','整理；整洁的'],['sock','袜子'],['shoe','鞋子'],['box','盒子；箱子']
      ]},
      { id: 7, title: "Let's Make a Call!", scene: '世界通讯塔', words: [
        ['behind','在……后面'],['same','相同的'],['city','城市'],['cousin','堂兄弟或姐妹；表兄弟或姐妹'],
        ['world','世界'],['both','两者；双方'],['tomorrow','明天'],['video','视频']
      ]},
      { id: 8, title: 'The Best Place to Live', scene: '理想家园城', words: [
        ['shop','购物；商店'],['mall','商场'],['park','公园'],['cinema','电影院'],['film','电影'],['zoo','动物园'],
        ['market','市场'],['supermarket','超市'],['than','比；比较'],['bye','再见；拜拜'],['choice','选择'],['hear','听说；听到'],
        ['sandwich','三明治'],['salt','盐'],['oil','油'],['juice','汁液；果汁']
      ]}
    ]
  }
};
