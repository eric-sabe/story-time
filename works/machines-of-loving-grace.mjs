// Machines of Loving Grace — Dario Amodei (Oct 2024)
// Scene data for the Story Time anthology. The hero (scene 0) is generated
// from `meta`; `scenes` are the content scenes. Each scene: { hue, sub, body, narration }.

export const meta = {
  id: "machines-of-loving-grace",
  order: 2,
  title: "Machines of Loving Grace",
  subtitle: "How AI Could Transform the World for the Better",
  author: "Dario Amodei",
  date: "October 2024",
  kind: "Essay",
  source: "Anthropic",
  signature: "gold",
  tagline: "A country of geniuses in a datacenter — and the future worth fighting for.",
  url: "https://www.darioamodei.com/essay/machines-of-loving-grace",
  sortDate: "2024-10-11",
  shelf: "The Future & The Stakes",
  hero: {
    sub: "Prologue",
    epigraph: {
      text: `I like to think (it has to be!)
of a cybernetic meadow
where mammals and computers
live together in mutually
programming harmony`,
      cite: "Richard Brautigan · 1967"
    },
    prologueNarration:
      "Machines of Loving Grace. An essay by Dario Amodei — the CEO of Anthropic — published in October twenty twenty-four. Amodei spends most of his time warning about the dangers of powerful AI. So people assume he's a pessimist. A doomer. He isn't. In fact, he argues — the reason to take the risks so seriously is that they are the only thing standing between us, and a future that is, in his words, fundamentally positive. And far more radical than almost anyone imagines. This is his attempt to picture that future. Not a fantasy… but an educated guess, at what the world could look like — if everything goes right. Let's walk through it. In full."
  }
};

export const scenes = [
  {
    hue: "gold", sub: "Why he stays quiet",
    narration:
      "First — a confession. About why he, and AI companies generally, so rarely talk this way. He gives four reasons. One: they want to maximize their leverage. The benefits of AI feel inevitable, driven by market forces — while the risks are not yet decided. So risk is where their words matter most. Two: they want to avoid sounding like propagandists, talking their own book. Three: they want to avoid grandiosity — the messianic tone of people who speak about the post-AI world like prophets, leading their followers to salvation. And four: they want to avoid science-fiction baggage — the uploaded minds and cyberpunk clichés that make the whole subject feel unreal. And yet, he says — we need a vision that genuinely inspires. Not just a plan to fight fires. Fear can motivate us. But it isn't enough. There has to be something we are fighting for. We need hope, as well.",
    body: `
      <p class="eyebrow"><span class="dot"></span> The premise</p>
      <h2>He is not a doomer.</h2>
      <p class="lede">Amodei rarely talks about the upside — and he's honest about why. Four reasons hold him back:</p>
      <ul class="reasons">
        <li><b>Maximize leverage.</b> The benefits feel inevitable; the risks are where his words can change the odds.</li>
        <li><b>Avoid propaganda.</b> It's bad for the soul to spend your time "talking your book."</li>
        <li><b>Avoid grandiosity.</b> No prophets leading their people to salvation.</li>
        <li><b>Avoid sci-fi baggage.</b> Uploaded minds and cyberpunk vibes make it all feel unreal.</li>
      </ul>
      <p>And yet we need a vision that inspires — not just a plan to fight fires. Fear motivates, but it isn't enough. <span class="hl">We need hope as well.</span></p>`
  },
  {
    hue: "gold", sub: "Powerful AI, defined",
    narration:
      "So — what exactly are we talking about? Amodei dislikes the term AGI. Too much hype. He prefers 'powerful AI' — and he defines it with care. Imagine a model smarter than a Nobel Prize winner, across most fields — biology, coding, mathematics, engineering, writing. It has every interface a human working remotely would have. It can use text, audio, and video. It can control a mouse and keyboard, browse the internet, run experiments — even give instructions to people. And it doesn't just answer questions. You can hand it a task that takes hours, days, or weeks — and it goes off and completes it on its own. The way a brilliant employee would. It has no body. But it can drive robots — and laboratory equipment — through a computer. And the very resources used to train one such model… could run millions of copies of it. Each thinking at ten to a hundred times human speed.",
    body: `
      <p class="eyebrow"><span class="dot"></span> The definition</p>
      <h2>Not “AGI.” Powerful AI.</h2>
      <p class="lede">He dislikes the hype-laden term. His definition is specific — a model that is:</p>
      <ul class="reasons">
        <li><b>Smarter than a Nobel laureate</b> across biology, coding, math, engineering, writing.</li>
        <li><b>Fully equipped</b> — text, audio, video, mouse and keyboard, the internet, lab robots.</li>
        <li><b>Autonomous</b> — given a task of hours, days, or weeks, it goes and finishes it.</li>
        <li><b>Massively parallel</b> — millions of copies, each running at 10–100× human speed.</li>
      </ul>`
  },
  {
    hue: "gold", sub: "A country of geniuses",
    narration:
      "He has a phrase for this. A country of geniuses… in a datacenter. Now — how quickly could something like that change the world? Amodei rejects both extremes. It is not the Singularity. Intelligence is not magic fairy dust — and even a nation of geniuses runs into hard physical limits. You cannot rush a cell culture. You cannot rush an animal trial. But nor is progress saturated, the way some skeptics claim. The truth is messier. And it turns on what he calls — the marginal returns to intelligence. For any given task: how much does being smarter actually help? And on what timescale?",
    body: `
      <p class="eyebrow"><span class="dot"></span> The idea</p>
      <h2>A country of geniuses in a datacenter.</h2>
      <p class="lede">How fast could that change the world? He rejects both extremes. Not an instant Singularity — intelligence <em>isn't magic fairy dust</em>. But not saturated either.</p>
      <p>It comes down to the <span class="hl">marginal returns to intelligence</span>: for any task, how much does being smarter actually help — and how fast?</p>
      <div class="stats">
        <div class="stat"><div class="fig"><span data-count-from="1" data-count-to="1">1</span><span class="u">M+ copies</span></div><div class="cap">run from one model's training compute</div></div>
        <div class="stat"><div class="fig"><span data-count-from="0" data-count-to="100">0</span><span class="u">× speed</span></div><div class="cap">up to, versus a human</div></div>
      </div>`
  },
  {
    hue: "gold", sub: "What holds intelligence back",
    narration:
      "Because intelligence is never the only ingredient. Amodei lists the factors that complement it — the ones that become the real bottlenecks, once intelligence is cheap. The speed of the outside world: experiments take the time they take. The need for data: sometimes it simply doesn't exist yet — and no amount of thinking will conjure it. Intrinsic complexity: some systems are chaotic, and resist prediction. Constraints from other humans: laws, regulations, the slow pace at which people change their habits. And physical laws: you cannot travel faster than light — and pudding does not unstir. But here is the crucial move. Over time — intelligence learns to route around these limits. Inventing new methods. Building new tools. Finding the paths through. The question is never simply how smart. It's how fast… and in what order.",
    body: `
      <p class="eyebrow"><span class="dot"></span> The framework</p>
      <h2>What holds intelligence back.</h2>
      <p class="lede">Genius alone isn't enough. Five factors become the real bottlenecks:</p>
      <ul class="reasons tight">
        <li><b>Speed of the outside world</b> — cells and trials run at their own pace.</li>
        <li><b>Need for data</b> — sometimes it doesn't exist yet.</li>
        <li><b>Intrinsic complexity</b> — chaotic systems resist prediction.</li>
        <li><b>Constraints from humans</b> — laws, habits, institutions.</li>
        <li><b>Physical laws</b> — no faster-than-light; pudding does not unstir.</li>
      </ul>
      <p>The key move: over time, intelligence <span class="hl">routes around</span> these limits — inventing tools and methods that dissolve them.</p>`
  },
  {
    hue: "green", sub: "Biology & health",
    narration:
      "Now — the five domains. And biology is where Amodei is boldest. The common view is that AI can analyze biological data — but it can't produce it. Garbage in, garbage out. He thinks that misses the point entirely. Don't picture AI as a tool for crunching data. Picture it as a virtual biologist — one that does everything a biologist does. It designs and runs experiments. It drives the lab robots. It invents whole new ways to measure. It directs teams of humans — the way a senior scientist guides a room full of graduate students. It's by speeding up the whole research process — not just one step of it — that AI transforms biology.",
    body: `
      <p class="eyebrow"><span class="num">01</span><span class="dot"></span> Biology &amp; health</p>
      <h2>Not a tool that reads the data. A scientist that makes it.</h2>
      <p class="lede">The skeptic says: AI can analyze data, but "garbage in, garbage out." Amodei says that misses the point.</p>
      <p>Picture instead a <span class="hl">virtual biologist</span> — designing and running experiments, driving lab robots, inventing new measurement tools, directing human teams like a principal investigator. It speeds up <em>the whole research process</em>.</p>`
  },
  {
    hue: "green", sub: "Why the returns are high",
    narration:
      "And he makes a striking argument — about how progress actually happens. A surprisingly large share of biology — more than half of it — flows from a tiny handful of broad discoveries. Tools for measuring. And tools for intervening. CRISPR, which lets us edit any gene at will. Genome sequencing, which has fallen in cost by orders of magnitude. Optogenetics. mRNA vaccines. CAR-T cell therapies. Roughly one such breakthrough… a year. And here's the thing — they tend to come from a small number of researchers. Often the very same people, again and again. CRISPR's key component was found in bacteria back in the nineteen-eighties. It took another twenty-five years for anyone to realize it could edit genes. That gap, Amodei argues, is a gap of insight — not of money. Which means hundreds more discoveries may be waiting — if only there were more brilliant, creative minds to find them. The returns to intelligence, here, are enormous.",
    body: `
      <p class="eyebrow"><span class="num">01</span><span class="dot"></span> The engine of progress</p>
      <h2>A handful of discoveries drive most of medicine.</h2>
      <p class="lede">More than half of progress in biology traces to a few broad tools for measuring and intervening:</p>
      <p class="chips"><span>CRISPR</span><span>Genome sequencing</span><span>Optogenetics</span><span>mRNA vaccines</span><span>CAR-T therapy</span><span>Microscopy</span></p>
      <p>CRISPR's key part was seen in bacteria in the <span class="hl">1980s</span> — it took 25 years to realize it could edit genes. That gap is insight, not funding. Hundreds more wait — if only there were more brilliant minds to find them.</p>`
  },
  {
    hue: "green", sub: "The compressed 21st century",
    narration:
      "Put it all together — and you arrive at his central prediction. Powerful AI could deliver the next fifty to a hundred years of biological progress… in five to ten. He calls it — the compressed twenty-first century. Not a hundred years of progress crammed into one; experiments still carry an irreducible delay. But the whole arc of twenty-first-century medicine — arriving within a decade of powerful AI. So — what would that actually mean? For you?",
    body: `
      <p class="eyebrow"><span class="num">01</span><span class="dot"></span> The central bet</p>
      <h2>The compressed 21st century.</h2>
      <p class="lede">His headline prediction: the next <span class="hl">50–100 years</span> of biological progress, delivered in five to ten.</p>
      <div class="stats">
        <div class="stat"><div class="fig">~<span data-count-from="100" data-count-to="7">100</span><span class="u">years</span></div><div class="cap">to make a century of medical progress</div></div>
        <div class="stat"><div class="fig"><span data-count-from="75" data-count-to="150">75</span><span class="u">yr lifespan</span></div><div class="cap">a doubling, as in the last century</div></div>
      </div>`
  },
  {
    hue: "green", sub: "What medicine delivers",
    narration:
      "His list is deliberately concrete. The reliable prevention and treatment of nearly all natural infectious disease — with mRNA and its successors pointing toward vaccines for almost anything. The elimination of most cancer. Death rates are already falling about two percent a year; with AI, reductions of ninety-five percent — in both deaths, and new cases — start to look possible. Especially with drugs that catch a cancer in its infancy. The prevention, and cure, of genetic disease — through better embryo screening, and safer descendants of CRISPR. The prevention of Alzheimer's, once we finally understand it. Better treatment of diabetes, obesity, heart disease. And what he calls biological freedom — real control over your own body: your weight, your appearance, your reproduction. And most radical of all — a doubling of the human lifespan. To around a hundred and fifty years. Life expectancy already nearly doubled in the twentieth century. Amodei thinks a compressed twenty-first could do it again — perhaps even reaching escape velocity. Where most people alive today… could live as long as they wish.",
    body: `
      <p class="eyebrow"><span class="num">01</span><span class="dot"></span> The list</p>
      <h2>What that decade could deliver.</h2>
      <ul class="reasons two">
        <li>Nearly all <b>infectious disease</b> prevented — "vaccines for anything."</li>
        <li>Most <b>cancer</b> eliminated — up to 95% less mortality and incidence.</li>
        <li><b>Genetic disease</b> prevented and cured.</li>
        <li><b>Alzheimer's</b> understood and prevented.</li>
        <li>Diabetes, obesity, <b>heart disease</b> in steep decline.</li>
        <li><b>Biological freedom</b> — control over your own body.</li>
      </ul>
      <p class="capnote">…and a human lifespan doubling toward <span class="hl">150 years</span> — perhaps reaching "escape velocity."</p>`
  },
  {
    hue: "sky", sub: "Neuroscience & mind",
    narration:
      "The second domain — the brain. If anything, Amodei says, mental health shapes our well-being even more directly than physical health. Hundreds of millions of people live with depression, addiction, schizophrenia, PTSD. And the same framework applies. Neuroscience advances through measurement tools — like optogenetics — and its progress can be accelerated in exactly the same way. There's even a feedback loop. What we've learned building AI — interpretability, the science of reading a neural network's inner workings — may become a tool for understanding the biological brain. Which is far, far harder… to open up, and probe.",
    body: `
      <p class="eyebrow"><span class="num">02</span><span class="dot"></span> Neuroscience &amp; mind</p>
      <h2>Then, the mind itself.</h2>
      <p class="lede">Mental health may shape well-being even more directly than physical health — and hundreds of millions live with depression, addiction, schizophrenia, PTSD.</p>
      <p>The same framework applies. And there's a feedback loop: <span class="hl">interpretability</span> — the science of reading an AI's internals — may become a tool for understanding the far-harder-to-probe biological brain.</p>`
  },
  {
    hue: "sky", sub: "What the mind gains",
    narration:
      "And his predictions here are just as radical. Most mental illness can probably be cured — PTSD, depression, schizophrenia, addiction — through some blend of molecular, genetic, and behavioral treatment. Plus what he calls an AI coach: something that helps you become the best version of yourself. Even structural conditions come within reach — and genetic prevention, too. But he goes further. The everyday troubles we don't call illness — being quick to anger, chronically anxious, unable to focus — those could be eased as well. And beyond that — the extraordinary states most of us reach only rarely. Moments of creative inspiration. Compassion. Transcendence. Peace. These, he imagines, could become a far larger part of ordinary life. The baseline of human experience — simply better.",
    body: `
      <p class="eyebrow"><span class="num">02</span><span class="dot"></span> The prediction</p>
      <h2>A better baseline of experience.</h2>
      <ul class="reasons two">
        <li>Most <b>mental illness</b> cured — PTSD, depression, schizophrenia, addiction.</li>
        <li>An <b>"AI coach"</b> that helps you become your best self.</li>
        <li>Even <b>structural</b> conditions and genetic prevention in reach.</li>
        <li>Everyday <b>anger, anxiety, focus</b> — eased.</li>
      </ul>
      <p class="capnote">And the rare heights — inspiration, compassion, transcendence, peace — a <span class="hl">larger part of ordinary life</span>.</p>`
  },
  {
    hue: "amber", sub: "Economic development",
    narration:
      "The third domain — is where Amodei grows more cautious. And more urgent. It is one thing to invent a cure. It is another thing entirely — to get it to everyone. Income per person is around two thousand dollars a year, in Sub-Saharan Africa. In the United States — seventy-five thousand. If AI supercharges the rich world, while the poor world is left behind — that, he says, would be a moral failure. A stain on everything else. He's less confident that AI can fix economies, than that it can transform biology. Economies are tangled up with human constraints — with corruption, weak institutions, the old socialist calculation problem. But he does see — real reasons for hope.",
    body: `
      <p class="eyebrow"><span class="num">03</span><span class="dot"></span> Economic development &amp; poverty</p>
      <h2>A cure means little if it never reaches you.</h2>
      <p class="lede">To let AI widen this gap, he says, would be a moral failure that stains everything else.</p>
      <div class="stats">
        <div class="stat"><div class="fig"><span class="u dollar">$</span><span data-count-from="2" data-count-to="2">2</span><span class="u">k / yr</span></div><div class="cap">income per person, Sub-Saharan Africa</div></div>
        <div class="stat"><div class="fig"><span class="u dollar">$</span><span data-count-from="2" data-count-to="75">2</span><span class="u">k / yr</span></div><div class="cap">income per person, United States</div></div>
      </div>
      <p>He's less sure AI can fix economies than biology — corruption, weak institutions, the socialist calculation problem. But there are real reasons for hope.</p>`
  },
  {
    hue: "amber", sub: "Closing the gap",
    narration:
      "Diseases have been wiped out before — by determined, top-down campaigns. Smallpox. Very nearly polio. And new tools make it easier still. A one-shot malaria vaccine. Or gene drives, that eliminate the mosquitoes carrying a disease — replacing millions of individual treatments, with a few decisive actions. On growth, there's precedent too. Several East Asian economies sustained ten percent a year — and caught up with the West. Amodei imagines 'AI finance ministers and central bankers' matching that. Or beating it. A dream scenario of twenty percent annual growth — lifting Sub-Saharan Africa to China's level, within a decade. Add a second Green Revolution, for food. Add AI-driven progress, on climate. And the picture becomes a genuine catching-up. He's honest that none of this is the default. It will take enormous effort — and there's the opt-out problem, of people refusing the very benefits on offer. But we have to try, he insists. The moral imperative is simply too great.",
    body: `
      <p class="eyebrow"><span class="num">03</span><span class="dot"></span> Reasons for hope</p>
      <h2>The developing world, catching up — fast.</h2>
      <ul class="reasons two">
        <li><b>Eradication</b> — smallpox, nearly polio; one-shot malaria vaccines; gene drives.</li>
        <li><b>Growth</b> — East Asia hit 10%/yr. "AI finance ministers" could match it.</li>
        <li><b>Food</b> — a second Green Revolution.</li>
        <li><b>Climate</b> — cheaper, less disruptive mitigation.</li>
      </ul>
      <p class="capnote">The dream: <span class="hl">20% annual growth</span>, lifting Sub-Saharan Africa to China's level in a decade. Not the default — a thing we must fight for.</p>`
  },
  {
    hue: "rose", sub: "Peace & governance",
    narration:
      "The fourth domain — is the one that worries him most. Suppose disease and poverty recede. Humans are still a danger — to each other. And here, Amodei sees no structural reason that AI favors democracy and peace — the way it favors human health. Conflict is adversarial. AI can serve the good guys — and the bad guys — alike. Worse — some forces tilt the wrong way. AI is superb at precisely the things an autocrat needs. Propaganda. And surveillance. The triumph of liberal democracy is not guaranteed. It may not even be likely. It will have to be won.",
    body: `
      <p class="eyebrow"><span class="num">04</span><span class="dot"></span> Peace &amp; governance</p>
      <h2>This one has to be won.</h2>
      <p class="lede">Unlike health, AI has <span class="hl">no structural bias</span> toward democracy. Conflict is adversarial — it arms the good guys and the bad guys alike.</p>
      <p>And some factors tilt the wrong way: AI is superb at the <em>propaganda and surveillance</em> autocrats depend on. The triumph of liberal democracy is not guaranteed — perhaps not even likely.</p>`
  },
  {
    hue: "rose", sub: "The entente strategy",
    narration:
      "His proposed strategy — he calls an entente. A coalition of democracies secures the supply chain of powerful AI — the chips, and the machines that make the chips — and races to build a decisive lead. While denying those same resources, to its rivals. That coalition uses its AI advantage for military security — the stick. And, at the same time — it offers the benefits of powerful AI, to any nation that joins in defending democracy. The carrot. A little like 'Atoms for Peace'. The aim is to isolate the worst actors — until they, too, are better off taking the same bargain as everyone else. If it works — democracies lead the world stage, with an advantage that lasts. What Amodei calls, hopefully, an 'eternal nineteen ninety-one' — the moment liberal democracy seemed ascendant, made permanent. And within nations — an AI that no dictator can fully censor, a superhumanly persuasive voice for freedom in every pocket, could put the wind at the backs of dissidents everywhere. He even imagines AI making democracies better than they are today. Fairer courts. Less bias. More responsive government. Constitutions that are, in a sense — self-enforcing.",
    body: `
      <p class="eyebrow"><span class="num">04</span><span class="dot"></span> The strategy</p>
      <h2>An entente of democracies.</h2>
      <p class="lede">A coalition secures the AI supply chain — chips, fab equipment — builds a lead, and blocks adversaries.</p>
      <ul class="reasons tight">
        <li><b>The stick</b> — AI-backed military security.</li>
        <li><b>The carrot</b> — share the benefits with all who join. Like "Atoms for Peace."</li>
        <li><b>The prize</b> — an "eternal 1991," democracy ascendant, made to last.</li>
      </ul>
      <p>An uncensorable AI in every pocket could back dissidents everywhere — and even make democracies <span class="hl">better than they are</span>: fairer courts, less bias, self-enforcing constitutions.</p>`
  },
  {
    hue: "lav", sub: "Work & meaning",
    narration:
      "Which leaves the final question. Perhaps the hardest of all. If AI can do everything — what are people for? On meaning, Amodei is reassuring. It's a mistake, he says — to think a task becomes meaningless, simply because an AI could do it better. Almost none of us is the best in the world at anything. And it never seems to trouble us. He plays video games. He bikes up mountains. He talks with his friends. All of it — economically worthless. All of it — worth doing. Meaning comes from human relationships, and connection. From effort, and accomplishment. Not from a paycheck.",
    body: `
      <p class="eyebrow"><span class="num">05</span><span class="dot"></span> Work &amp; meaning</p>
      <h2>If machines can do everything, what are people for?</h2>
      <p class="lede">His answer is gentle. A task isn't meaningless just because an AI could do it better — <span class="hl">almost no one is the best at anything</span>, and it never troubles us.</p>
      <p>He plays video games, bikes up mountains, talks with friends: zero economic value, all of it worth doing. Meaning comes from connection, effort, and accomplishment — not from being paid.</p>`
  },
  {
    hue: "lav", sub: "The economic question",
    narration:
      "The economics are trickier — and he admits it freely. In the short term, comparative advantage protects us. As long as AI is better at ninety percent of a job — the remaining ten percent makes humans more valuable, not less. And that ten percent tends to expand, into brand-new kinds of work. But in the long run, he's candid. AI may become so cheap — and so capable — that our current economic arrangement simply stops making sense. And we will need a broader conversation. About how society itself should be organized. Universal basic income might be part of the answer. He suspects — only a small part. He doesn't pretend to know. What he is sure of, is that civilization has crossed these thresholds before. From hunting, to farming. From farming, to industry. And that the exploitative, dystopian versions of this future are possible too — and must be prevented.",
    body: `
      <p class="eyebrow"><span class="num">05</span><span class="dot"></span> The harder half</p>
      <h2>How will people earn a living?</h2>
      <p class="lede">Short term, <span class="hl">comparative advantage</span> protects us: if AI is better at 90% of a job, the last 10% makes humans <em>more</em> valuable — and that sliver expands into new work.</p>
      <p>Long term, he's candid: AI may grow so cheap and capable that today's economy stops making sense. UBI is maybe a small part. He has no full answer — only the knowledge that civilization has crossed such shifts before, and that dystopian versions must be prevented.</p>`
  },
  {
    hue: "gold", sub: "Taking stock",
    narration:
      "So — taking stock. Amodei knows this vision is radical. That it may strike many people as an absurd fantasy. That not everyone will even want it. And yet — there's something blindingly obvious about it, too. As if every honest attempt to imagine a genuinely good world… keeps arriving, roughly — here. He points to Iain Banks's Culture novels. And to a simple idea: that our basic human intuitions — fairness, cooperation, curiosity, autonomy — are cumulative, in a way our darker impulses are not. It is easy to argue that children shouldn't die of disease. Easy, from there, to argue that everyone's children deserve that — equally. And not far, from there — to rule of law, democracy, and the values of the Enlightenment. This is where humanity was already heading. AI simply offers a chance to arrive sooner — to make the logic starker, and the destination clearer.",
    body: `
      <p class="eyebrow"><span class="dot"></span> Taking stock</p>
      <h2>Overdetermined.</h2>
      <p class="lede">The vision is radical — an absurd fantasy, some will say. And yet something about it is <span class="hl">blindingly obvious</span>, as if every honest attempt to imagine a good world lands roughly here.</p>
      <p>Basic human intuitions — fairness, cooperation, curiosity, autonomy — are cumulative in a way our destructive impulses aren't. Children shouldn't die of disease; everyone's children deserve that equally; and from there it isn't far to rule of law and Enlightenment values. AI just makes the destination clearer.</p>`
  },
  {
    hue: "gold", sub: "Coda", wide: true,
    narration:
      "If it truly comes to pass — across five, or ten, years. The defeat of most disease. Billions, lifted out of poverty. A renaissance of liberal democracy, and human rights. Then Amodei suspects — that everyone watching will be surprised, by the effect it has on them. Not merely the experience of benefiting from it all — extraordinary as that will be. But the experience of watching a long-held set of ideals… materialize, in front of us — all at once. Many, he says, will be moved to tears. It is a thing of transcendent beauty. And we have the chance — to play some small part — in making it real.",
    body: `
      <p class="eyebrow"><span class="dot"></span> Coda</p>
      <p class="quote">If it arrives — disease defeated, billions lifted from poverty, freedom renewed — Amodei suspects many of us will be <span class="grace">moved to tears</span>, watching a long-held dream materialize at last.</p>
      <p class="lede" style="margin-top:2.4rem">It is a world worth fighting for. It will take enormous effort and struggle from many brave and dedicated people.</p>
      <p>“It is,” he writes, “a thing of <em>transcendent beauty</em>. We have the opportunity to play some small role in making it real.”</p>
      <p class="fnote">Machines of Loving Grace · Dario Amodei · October 2024</p>`
  }
];

export default { meta, scenes };
