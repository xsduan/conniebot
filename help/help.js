'use strict'

/*
 * vars
 */

// libraries
const Discord = require('discord.js')
const config = require('config')

// local modules
const embed = require('../embed/embed')

const help = [
  ['x,z,p[phonetic] or x,z,p/phonemic/',
    'Converts XSAMPA, ZSAMPA, or APIE. Hopefully.'],
  [config.get('prefix') + 'help',
    'Reply with this message.'],
  ['About these conversions', `<https://en.wikipedia.org/wiki/X-SAMPA>
<http://www.kneequickie.com/kq/Z-SAMPA>
<https://pastebin.com/eSyXwg1Z>`],
  ['\u200B',
    `found a bug or want to suggest a feature?
github: <https://github.com/xsduan/conniebot>
come discuss: https://discord.gg/MvWMH3z`]
]

/*
 * functions
 */

/**
 * Return Help message, nicely formatted.
 * @param {User} user User to put as head
 * @returns {RichEmbed} Help message
 */
function createEmbed (user) {
  let helpEmbed = new Discord.RichEmbed()
    .setColor(config.get('embeds.colors.success') || [152, 219, 52])
    .setAuthor(user.username, user.avatarURL)
    .setTitle('Commands')

  help.forEach(function (entry) {
    helpEmbed.addField(...entry)
  })

  return helpEmbed
}

/*
 * exports
 */

/**
 * Sends a help message.
 * @param {Channel} channel Channel to send to
 * @param {User} user Who the sender is
 * @returns {(Promise<(Message|Array<Message>)>)|null} Whatever message needs handling
 */
exports.help = function (channel, user) {
  return embed.send(channel, createEmbed(user))
}

/* eslint-disable no-tabs */
/*
Here is the paste if the site ever shuts down or otherwise deletes the pastebin:
(These conversions are done in the listed order)

XSAMPA Conversions
--------
|\|\		ǁ
_B_L		˩˨
_H_T		˦˥
_R_F		˧˦˧
d`z`		ɖ͡ʐ
G\_<		ʛ
J\_<		ʄ
t`s`		ʈ͡ʂ
<F>		↘
<R>		↗
_?\		ˤ
b_<		ɓ
d_<		ɗ
dK\		d͡ɮ
dz\		d͡ʑ
g_<		ɠ
r\`		ɻ
ts\		t͡ɕ
!\		ǃ
-\		‿
3\		ɞ
:\		ˑ
<\		ʢ
=\		ǂ
>\		ʡ
@\		ɘ
@`		ɚ
)		◌͡
?\		ʕ
|\		ǀ
||		‖
_"		◌̈
_-		◌̠
_0		◌̥
_=		◌̩
_>		ʼ
_+		◌̟
_/		◌̌
_\		◌̂
_^		◌̯
_A		◌̘
_a		◌̺
_B		˩
_c		◌̜
_d		◌̪
_e		◌̴
_F		˥˩
_G		ˠ
_H		˦
_h		ʰ
_j		ʲ
_k		◌̰
_L		˨
_l		ˡ
_M		˧
_m		◌̻
_N		◌̼
_n		ⁿ
_O		◌̹
_o		◌̞
_q		◌̙
_R		˩˥
_r		◌̝
_T		˥
_t		◌̤
_v		◌̬
_w		ʷ
_X		◌̆
_x		◌̽
_}		◌̚
_~		◌̃
B\		ʙ
d`		ɖ
dz		d͡z
dZ		d͡ʒ
G\		ɢ
gb		g͡b
h\		ɦ
H\		ʜ
I\		ᵻ
j\		ʝ
J\		ɟ
K\		ɮ
kp		k͡p
l\		ɺ
L\		ʟ
l`		ɭ
M\		ɰ
N\		ɴ
n`		ɳ
Nm		ŋ͡m
O\		ʘ
p\		ɸ
r\		ɹ
R\		ʀ
r`		ɽ
s\		ɕ
s`		ʂ
t`		ʈ
tK		t͡ɬ
ts		t͡s
tS		t͡ʃ
U\		ᵿ
v\		ʋ
x\		ɧ
X\		ħ
z\		ʑ
z`		ʐ
!		ꜜ
"		ˈ
"		ʲ
%		ˌ
&		ɶ
'		ʲ
-		<separator>
1		ɨ
2		ø
3		ɜ
4		ɾ
5		ɫ
6		ɐ
7		ɤ
8		ɵ
9		œ
:		ː
=		◌̩
@		ə
.		.
?		ʔ
^		ꜛ
|		|
`		˞
A		ɑ
B		β
C		ç
D		ð
E		ɛ
F		ɱ
g		ɡ
G		ɣ
H		ɥ
I		ɪ
J		ɲ
K		ɬ
L		ʎ
M		ɯ
N		ŋ
O		ɔ
P		ʋ
Q		ɒ
R		ʁ
S		ʃ
T		θ
U		ʊ
V		ʌ
W		ʍ
X		χ
Y		ʏ
Z		ʒ
{		æ
}		ʉ
~		◌̃

ZSAMPA Conversions
d`z`		ɖ͡ʐ
t`s`		ʈ͡ʂ
J\_<		ʄ
G\_<		ʛ
d_<`		ᶑ
dK\		d͡ɮ
dz\		d͡ʑ
ts\		t͡ɕ
<R>		↗
<F>		↘
_~\		◌͊
_?\		ˁ
_>\		↑
_=\		˭
_<\		↓
_%\		ʢ
_V\		˯
_t\		◌̪͆
_P\		ᵝ
_N\		◌̼
_H\		ꜝ
_h\		ʰ*
_f\		◌͌
_d\		◌͆
_a\		◌̳
r\`		ɻ
K\`		ɭ̝
k_p		k͡p
g_<		ɠ
g_b		g͡b
d_<		ɗ
c\`		ɽ͡r
b_<		ɓ
Nm		ŋ͡m
tK		t͡ɬ
dZ		d͡ʒ
tS		t͡ʃ
dz		d͡z
ts		t͡s
_}		◌̚
_^		◌̯
_?		ˀ
_>		ʼ
_;		ⁿ
_-		◌̠
_+		◌̟
_"		◌̈
_!		!
_9		◌͚
_8		◌̣
_7		ǁ
_0		◌̥
_Y		◌͈
_y		◌͉
_X		◌̯
_x		◌̽
_w		ʷ
_v		◌̬
_t		◌̤
_R		◌̌
_r		◌̝
_q		◌̙
_P		◌̪
_O		◌̹
_o		◌̞
_N		◌̼
_n		ⁿ
_M		◌̄
_m		◌̻
_L		◌̀
_l		ˡ
_k		◌̰
_j		ʲ
_H		◌́
_h		ʰ
_G		ˠ
_F		◌̂
_f		◌͎
_E		◌̼
_e		◌̴
_d		◌̪
_C		◌͍
_c		◌̜
_B		◌̏
_A		◌̘
_a		◌̺
>\		ʡ
<\		ʢ
?\		ʕ
:\		ˑ
4\		ɢ̆
3\		ɞ
@`		ɚ
@\		ɘ
z\		ʑ
z`		ʐ
V\		ʟ̝
v\		ʋ
t\		ʭ
t`		ʈ
s\		ɕ
s`		ʂ
R\		ʀ
r\		ɹ
P\		β̞
p\		ɸ
N\		ɴ
n`		ɳ
M\		ɰ
m\		ɯ̽
L\		ʟ
l`		ɭ
l\		ɺ
K\		ɮ
K`		ɭ̝̊
J\		ɟ
j\		ʝ
I\		ɪ̈
i\		ɨ
h\		ɦ
G\		ɢ
g\		¡
F\		ʟ̝̥
f\		ʩ
d`		ɖ
d\		ɾ
C\		ʎ̝̥
c\		ʀ̟
B\		ʙ
b\		ⱱ
a\		ä
)		◌͡
!		ꜜ
^		ꜛ
?		ʔ
:		ː
'		ʲ
9		œ
8		ɵ
7		ɤ
6		ɐ
5		ɫ
3		ɜ
2		ø
1		ɨ
}		ʉ
{		æ
@		ə
%		ˌ
"		ˈ
.		.
Z		ʒ
Y		ʏ
X		χ
V		ʌ
Ü		ʏ
Û		ʊ̈
U		ʊ
û		ʉ
T		θ
S		ʃ
R		ʁ
Q		ɒ
P		ʋ
Ô		ɞ
Ö		œ
O		ɔ
ô		ɵ
ö		ø
N		ŋ
L		ʎ
K		ɬ
J		ɲ
Ï		ɯ̽
I		ɪ
î		ɨ
ï		ɯ
H		ɥ
G		ɣ
F		ɱ
Ê		ɜ
Ë		ʌ
E		ɛ
ê		ɘ
ë		ɤ
D		ð
C		ç
B		β
Å		ɒ
Â		ä
A		ɑ
å		ɶ
â		ɐ
ä		æ

APIE Conversions
"a:		ā́
"e:		ḗ
"i:		ī́
"l.		ĺ̥
"m.		ḿ̥
"n.		ń̥
"o:		ṓ
"r.		ŕ̥
"u:		ū́
g'h		ǵʰ
gvh		gʷʰ
x1.		h̥₁
x2.		h̥₂
x3.		h̥₃
x4.		h̥₄
x5.		h̥₅
x@.		h̥ₐ
xx.		h̥ₓ
"a		á
"e		é
"i		í
"o		ó
"u		ú
a:		ā
bh		bʰ
dh		dʰ
e:		ē
g'		ǵ
gh		gʰ
gv		gʷ
i:		ī
k'		ḱ
kv		kʷ
l.		l̥
m.		m̥
n.		n̥
o:		ō
r.		r̥
u:		ū
x1		h₁
x2		h₂
x3		h₃
x4		h₄
x5		h₅
x@		hₐ
xx		hₓ
*/
/* eslint-enable no-tabs */
