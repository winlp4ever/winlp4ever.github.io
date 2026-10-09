---
title: 🇦🇷🐐 Messi in numbers
date: 2026-10-09
description: A tribute to Lionel Messi in statistics, three days after his last game for Argentina. Where he sits among the great scorers and playmakers, his output at every age, the dribbling seasons, Miami at 38, the World Cup, and the records.
tags: [football, data]
category: notes
glyph: outlier
figures: 8
---

I watched a tribute video about Lionel Messi this week and wanted the numbers next to the pictures. On 6 October he played his last game for Argentina, a 3-0 friendly against Benin at the Monumental, where he set up two goals and scored a penalty.

As of 7 October he has 932 official goals and 426 assists in 1,178 games for club and country. That's 1.26 goals or assists every 90 minutes over 96,927 minutes, or a goal every 104 minutes for twenty-one years. The 426 assists are the most anyone has recorded, and 817 of the goals are non-penalty goals, also the most on record. These totals come from [MessiVsRonaldo.app](https://www.messivsronaldo.app/), which counts assists the way Opta does. Under Transfermarkt's definition the assist total is closer to 460.

## scorer and creator

Great attackers usually sort into two groups. Scorers like Lewandowski, Haaland and Cristiano Ronaldo score a lot and assist a little. Creators like De Bruyne, Özil and Thomas Müller assist a lot and score a little. Plot goals against assists for the best players of the last few decades and the two groups form two clusters, with an empty corner in the top right where a player would need both.

<figure class="wide">
<ms-cluster data-fig data-label="fig 1 · scorer and creator">
<p class="fallback">A scatter of non-penalty goals per 90 against assists per 90 in Europe's top five leagues for 33 great attackers and playmakers, over their whole careers there. Scorers sit at the bottom right: Mbappé 0.83 and 0.29, Haaland 0.82 and 0.21, Lewandowski 0.76 and 0.17, Cristiano Ronaldo 0.70 and 0.24. Creators sit at the top left: De Bruyne 0.28 and 0.48, Thomas Müller 0.34 and 0.44, Özil 0.20 and 0.40. Neymar is between at 0.55 and 0.39. Messi is alone in the top right at 0.83 non-penalty goals and 0.42 assists per 90: Mbappé's scoring rate and almost De Bruyne's assist rate.</p>
</ms-cluster>
<figcaption><b>fig 1</b>Messi scored like the best scorers and assisted like the best creators, at the same time, across his whole career in Europe. <span class="m">FBref (Opta data), every top-five-league season each player played, read from archived pages. FBref has no data before 1998-99, so Ronaldo Nazário, Zidane and Riquelme are only partly covered. Hover a dot for the name.</span></figcaption>
</figure>

Over his whole top-five-league career Messi averaged 0.83 non-penalty goals and 0.42 assists per 90. Mbappé scores at the same rate and assists a third less. De Bruyne assists slightly more and scores a third as often. In the 2009-10 to 2020-21 window, when most of these players overlap, Messi's combined rate was 1.37 per 90, and the next player with a full set of seasons was Ronaldo at 1.09.

The same picture holds over whole club careers, counted per game in all competitions, which lets older players in.

<figure class="wide">
<ms-career data-fig data-label="fig 2 · whole careers">
<p class="fallback">A scatter of club goals per game against assists per game over whole careers for 38 great players. Gerd Müller has the highest scoring rate at 0.93 goals but 0.18 assists. Haaland and Mbappé score 0.79 a game. Cruyff has the highest assist rate at 0.43 with 0.57 goals. Messi sits at 0.83 goals and 0.41 assists per game, 1.24 together, the highest combined rate on the chart. Below the axis, five players with goals but no assist data: Eusébio 1.01, Pelé 0.94, Romário 0.77, Batistuta 0.54, Maradona 0.53.</p>
</ms-career>
<figcaption><b>fig 2</b>Gerd Müller, Pelé and Eusébio scored more often, and Cruyff assisted slightly more often. Nobody else is close on both. <span class="m">Transfermarkt club totals via a public API mirror, read 9 October 2026; Wikipedia goals for Eusébio, Pelé, Romário, Batistuta and Maradona, whose assists weren't recorded. Hollow dots played much of their career before 1999, so their assists are a floor.</span></figcaption>
</figure>

There's a long tradition of rating Pelé, Eusébio and Gerd Müller as the greatest pure scorers, and the chart agrees. The difference is that they were scorers. Messi scored at close to their rate and set up goals at Cruyff's.

## every age

The usual age curve for a forward rises into the mid-twenties and falls after 30. StatsBomb's study of the top five leagues found the median forward peaks at 28 with 0.43 non-penalty goals and assists per 90.

<figure class="wide">
<ms-age data-fig data-label="fig 3 · every age">
<p class="fallback">Goals plus assists per 90 minutes at each age from 18 to 39, in all official club and country games. The rate climbs from 0.79 at 18 to 1.67 at 24, stays between 1.2 and 1.5 through his twenties and early thirties, dips to 1.01 and 0.96 at 33 and 34 (his last Barcelona season and first PSG season), and rises again in Miami to 1.48 at 36 and 1.70 at 38. Without penalties the line sits about 0.1 lower. A dashed line at 0.43 marks the median Big-5 forward at peak age.</p>
</ms-age>
<figcaption><b>fig 3</b>From 21 to 39 his rate dropped below 1.0 once, at 34. Without penalties it never fell below 0.85, about twice the median forward's best. <span class="m">MessiVsRonaldo.app by age, where an age year starts on his birthday, 24 June; age 39 runs only to 7 October 2026. Ages 19 and 22 have no penalty split. Benchmark: StatsBomb's 2016 age-curve study, Big-5 forwards, 2010-11 to 2015-16.</span></figcaption>
</figure>

From 2010-11 to 2019-20 he averaged 1.42 non-penalty goals and assists per 90 in La Liga. Ryan O'Hanlon at ESPN went looking for anyone else who had matched that number for even a single season in Europe's top five leagues since 2010, and found six seasons by six players.

<figure class="wide">
<ms-decade data-fig data-label="fig 4 · ten years at 1.42">
<p class="fallback">Non-penalty goals plus assists per 90: Messi's ten-year La Liga average of 1.42, against Mbappé 1.24, Cristiano Ronaldo 1.13, Sancho 1.06 and Suárez 1.06 over the same kind of span. Below it, the only seasons by anyone else since 2010 that reached 1.42: Higuaín 2011-12, Ronaldo 2014-15, Ibrahimović 2015-16, Suárez 2015-16, Bale 2015-16 and Mbappé 2018-19.</p>
</ms-decade>
<figcaption><b>fig 4</b>Six players had one season at the level Messi averaged for ten years. <span class="m">Ryan O'Hanlon, ESPN, November 2020, from FBref data. Single source.</span></figcaption>
</figure>

His worst season in that decade was 1.16, in 2013-14, when he was injured for part of the year. Every other season was 1.27 or higher.

## the dribbler

Opta's count of completed dribbles in the top five leagues, from 2006-07 to October 2023, has Messi at 2,358. Eden Hazard is second with 1,285.

<figure class="wide">
<ms-dribbles data-fig data-label="fig 5 · completed dribbles">
<p class="fallback">Most completed dribbles in Europe's top five leagues from 2006-07 to October 2023: Lionel Messi 2,358, Eden Hazard 1,285, Franck Ribéry 1,061, Neymar 984, Wilfried Zaha 972, Cristiano Ronaldo 937. Messi's total is 1,073 above second place.</p>
</ms-dribbles>
<figcaption><b>fig 5</b>The gap between first and second is bigger than Ronaldo's whole total. <span class="m">OptaJoe, 23 October 2023.</span></figcaption>
</figure>

Season by season, he was the top dribbler in Europe more often than not, and close to the top in the other years.

<figure class="wide">
<ms-leaders data-fig data-label="fig 6 · who led europe">
<p class="fallback">The player with the most successful dribbles in Europe's top five leagues each season from 2009-10 to 2020-21. Messi led in 2009-10 (202), 2010-11 (265), 2011-12 (220), 2014-15 (266), 2017-18 (222), 2019-20 (239) and 2020-21 (188). The 2012-13 leader is unknown. Hazard led in 2013-14 (174, Messi second with 167) and 2018-19 (170, Messi second with 169). Neymar led in 2015-16 (189) and 2016-17 (218), when Messi was under 160 and his place is unknown. Messi led again in 2017-18, the season after Neymar left for PSG.</p>
</ms-leaders>
<figcaption><b>fig 6</b>Messi led seven of the eleven seasons with a known leader and was second in two more. The two Neymar led were Neymar's last two seasons at Barcelona. <span class="m">Top 20 successful-dribble seasons since 2009, published by GiveMeSport in July 2022 from @ThePopFoot. No data provider is named and the counts probably include the Champions League. A season missing from the top 20 had nobody above 160.</span></figcaption>
</figure>

From 2009-10 to 2014-15 he led four of the five seasons with a known leader, and his 266 in 2014-15 is the highest season on the list. Then he drops out of the top 20 for two seasons. Those were Neymar's last two years at Barcelona, in the Messi, Suárez and Neymar attack, when Neymar took on more of the dribbling and Messi moved deeper and became more of a playmaker. In 2017-18, the first season after Neymar left, Messi was first again.

Counts that use league games only, rebuilt from archived FBref tables, move him around a little but not out of the top three: first in 2017-18 and 2019-20, third in 2018-19, second in 2020-21, and second at PSG in 2022-23, aged 35. In 2010-11 Opta also had him first in Europe per 90 minutes, at 5.9. As a teenager he completed 7.4, 7.1 and 8.4 per 90 in 2005-06 to 2007-08, by StatsBomb's [count](https://www.hudl.com/blog/messi-data-biography-analysis-young-messi-2004-05-to-2007-08), a rate nobody in La Liga matched in 2018-19. Over 2012 to 2023 the Analyst ranks him [13th per 90](https://theanalyst.com/articles/definitive-guide-to-dribblers-stats), behind wingers whose main job is to dribble, but first by far in volume, with 1,509 completed and nobody else over 1,000.

The numbers miss the thing everyone remembers, which is the run past four or five players that ends in a goal. He scored it against Getafe in 2007, against Real Madrid in the 2011 Champions League semi-final and against Athletic Club in the 2015 Copa del Rey final, and he was still doing it in Miami. In July 2025 against Montréal he picked the ball up just past halfway and [went past four defenders](https://www.goal.com/en/news/lionel-messi-inter-miami-cf-montreal-leo/blt5d036e3bc8df68de) before rolling it in, at 38.

Lamine Yamal is the volume leader now. He completed 223 dribbles in 2024-25, the most in Europe by a distance, and by one count averaged 4.8 a game in La Liga last season. That's still below Messi's rate at the same age, though providers count dribbles differently, so the comparison only shows a direction.

## finishing

Messi has 817 non-penalty goals to Cristiano Ronaldo's 795, even though Ronaldo has 47 more goals in total. Over 16 La Liga seasons he took 2,162 shots worth 339.6 expected goals and scored 444, according to KU Leuven's sports analytics group. In O'Hanlon's numbers since 2008 he scored 108.6 more league goals than expected, and the next player was Gonzalo Higuaín at 58.1. Not every season beat the model. In the first half of 2020-21 he had 5 non-penalty goals from 8.5 expected, and his first PSG season was well under too.

He has 76 direct free-kick goals by MessiVsRonaldo.app's count (75 in another tally up to 22 September), second all-time. The only player ahead is Marcelinho Carioca with 78, nearly all scored in Brazil. Marcelinho's time in Europe's big leagues was five La Liga games for Valencia in 1997 and ten Ligue 1 games for Ajaccio in 2004.

## at 39

Most players his age have retired. Of those who haven't, Cristiano Ronaldo scored 25 Saudi league goals at 39 and 40, and Zlatan Ibrahimović's 15 Serie A goals at 39 made him the oldest player to score 15 in a Serie A season. Messi, at 39, has 21 MLS goals and 13 assists this season, first in goals and joint first in assists on ESPN's table, and 36 goals and 19 assists in 41 games for club and country in 2026.

American Soccer Analysis publishes a model called goals added, which values every pass, dribble, shot and tackle by how much it changes the chance of a goal. I pulled every MLS player-season since 2013 from its open API and kept those with at least 1,500 minutes, 3,649 of them.

<figure class="wide">
<ms-mls data-fig data-label="fig 7 · goals added in mls">
<p class="fallback">A histogram of goals added per 96 minutes for 3,649 MLS player-seasons from 2013 to 2026 with at least 1,500 minutes. Most seasons sit between -0.1 and 0.1, with 0 being league average. The best seasons by anyone else are Carlos Vela 2019 at 0.338 and Zlatan Ibrahimović 2019 at 0.327. Messi's three seasons sit further out: 0.377 in 2024, 0.443 in 2026 so far and 0.501 in 2025.</p>
</ms-mls>
<figcaption><b>fig 7</b>Messi's three MLS seasons are the three highest in the league's goals-added history, and 2025 is far beyond the next player's best. <span class="m">American Soccer Analysis API, pulled 9 October 2026. ASA's 2025 row appears to include the playoffs, and 2026 is still in progress.</span></figcaption>
</figure>

His 2025 total of 17.35 goals added is the highest single season in the data, ahead of Carlos Vela's 11.21 in 2019. Most of it came from passing (7.35) and dribbling (5.09). Shooting was third. MLS is a weaker league than La Liga, so this measures the distance from an MLS pack, but the distance is large: in 2025 he was about five standard deviations above the league's attacking players.

## the world cup

He played six World Cups, from 2006 to 2026, and 34 matches, more than anyone. At the 2026 tournament, aged 38 and 39, he scored 8 goals and made 4 assists in 8 games. He scored a hat-trick against Algeria at 38 years and 357 days, the oldest World Cup hat-trick, and started his third World Cup final, which no player had done before. Cafu also played in three finals, but came off the bench in 1994. Opta counted that 47% of all World Cup goals ever scored by players aged 38 or over are his.

Spain won the final 1-0 in extra time, with Argentina failing to put a shot on target. He finished on 21 World Cup goals. Kylian Mbappé had scored twice in the third-place match the day before to reach 22, so Messi ends second on the all-time list, ahead of Miroslav Klose's 16. He holds the records for World Cup assists (12), goal contributions (33), matches won (23) and matches as captain (27).

## ronaldo and the others

Cristiano Ronaldo has more goals, 979 to 932, more Champions League goals and more international goals. Messi leads on non-penalty goals, goals per game, assists, Ballon d'Ors and the World Cup.

<figure class="wide">
<ms-vs data-fig data-label="fig 8 · messi and ronaldo">
<p class="fallback">Messi against Cristiano Ronaldo on nine measures: goals 932 to 979, non-penalty goals 817 to 795, assists 426 to 261, goals per game 0.79 to 0.73, Ballon d'Or 8 to 5, Champions League goals 129 to 140, international goals 126 to 146, World Cup goals 21 to 10, direct free-kick goals 76 to 65.</p>
</ms-vs>
<figcaption><b>fig 8</b>Ronaldo leads on totals in the competitions he played longest, and Messi leads on rate and creation. <span class="m">MessiVsRonaldo.app, 7 October 2026, official senior matches; records checked against Wikipedia. Free-kick counts are fan-site figures.</span></figcaption>
</figure>

At the same age, 39, Messi had 916 goals and 414 assists to Ronaldo's 873 and 249, and was involved in a goal every 71.5 minutes against Ronaldo's 87.4. Ronaldo's case rests on things the chart doesn't show well: league titles in four countries, five Champions League wins, and still scoring in a top flight at 41.

Comparing across eras is harder, because assists, dribbles and expected goals only exist from about 2006. Pelé scored 775 official goals in 840 games and won three World Cups. Maradona was directly involved in 10 of Argentina's 14 goals at the 1986 World Cup. The recent expert lists, FourFourTwo's in 2025 and The Athletic's *Soccer 100* the same year, both put Messi first, with Pelé and Maradona next.

On 31 August he announced he would stop playing for Argentina. He ends with 208 caps, 126 goals and 67 assists, all records for Argentina, and his last goal for them was the penalty against Benin.

## the records

This is the long list. Records he shares are marked, and so are the ones he held and lost. Sources are Guinness World Records, FIFA, UEFA, La Liga, MLS, Opta and Wikipedia's [list of his career achievements](https://en.wikipedia.org/wiki/List_of_career_achievements_by_Lionel_Messi), as of 9 October 2026.

**Awards**

- 8 Ballon d'Or awards, the most ever, and the only player to win four in a row (2009 to 2012). He's also the only winner in three different decades.
- 3 The Best FIFA Men's Player awards, the most, and 8 FIFA world player awards across all its formats.
- 2 World Cup Golden Balls (2014, 2022), the only player with two. The 2022 one made him the oldest winner, at 35. He took the Silver Ball in 2026.
- 2 Club World Cup Golden Balls (2009, 2011), also the only player with two.
- 6 European Golden Shoes, the most, and the only player to win three in a row (2017 to 2019).
- 8 Pichichi trophies as La Liga's top scorer, the most.
- 17 selections in the FIFPRO World 11, the most.
- 2 Laureus Sportsman of the Year awards (2020, 2023), the only footballer to win it.
- 2 MLS MVP awards (2024, 2025), the first player to win it in back-to-back years.

**Goals and assists, all-time**

- Most official assists: 426.
- Most official goal contributions: 1,358.
- Most official non-penalty goals: 817.
- Most goals for a single club: 672 for Barcelona, passing Pelé's 643 for Santos.
- Most assists for a single club: 269 for Barcelona.
- Most goals in a calendar year: 91 in 2012 (79 for Barcelona, 12 for Argentina).
- Most club goals in a season: 73 in 2011-12.
- Most goals in Europe's top five leagues: 496.
- Most goals in a single league: 474 in La Liga.
- Most goals in finals: 36.
- Most goals in FIFA competitions: 33.
- Most international assists by a man: 67.
- Most team trophies won: 47 or 48, depending on how youth titles are counted.

**Consistency**

- 13 consecutive seasons with 30 or more club goals.
- 10 consecutive seasons with 40 or more club goals.
- The only player with 60 or more club goals in two consecutive seasons (2011-12 and 2012-13).
- 13 consecutive La Liga seasons with 20 or more goals.
- 15 consecutive La Liga seasons with 10 or more goals.

**World Cup**

- Most matches: 34. Most as captain: 27. Most wins: 23.
- Most assists: 12, and most in knockout games: 10 (records since 1966).
- Most goal contributions: 33.
- Most chances created: 99.
- Most consecutive matches scored in: 9.
- Most consecutive matches with a goal or assist: 11.
- An assist at all six of his World Cups.
- The first player to score in all five rounds of one World Cup (2022).
- The only player to score at a World Cup as a teenager, in his twenties and in his thirties.
- Oldest World Cup hat-trick: 38 years, 357 days (2026).
- Oldest outfield player in a World Cup semi-final (39 years, 21 days) and final (2026).
- The first player to start three World Cup finals. Three final appearances in total is shared with Cafu.
- Shared: six World Cups played, with Cristiano Ronaldo.
- Shared: 8 goals at one World Cup for Argentina, level with Guillermo Stábile in 1930.
- Held and lost: the all-time World Cup scoring record, from his 17th goal in June 2026 until Mbappé's 22nd in July.

**Argentina and the Copa América**

- Most caps (208), goals (126) and assists (67) for Argentina, and the most caps and goals by a South American man.
- Most goals for Argentina in a calendar year: 18 (2022). Most in one game: 5, against Estonia.
- Most South American World Cup qualifying goals (36) and appearances (72).
- Most Copa América appearances (39), assists (18), finals (5) and wins (25).
- The only player to win the best-player award at every major tournament he played: the 2005 U-20 World Cup, the 2014 and 2022 World Cups, and the 2015 and 2021 Copa Américas.

**Champions League**

- Most Champions League goals for one club: 120 for Barcelona.
- Most round-of-16 goals: 29.
- Most goals in a quarter-final match: 4, against Arsenal in 2010.
- The first player with two Champions League hat-tricks in one season (2011-12).
- Most Champions League player-of-the-match awards: 67.
- Shared: most Champions League hat-tricks, 8, with Cristiano Ronaldo.
- Shared: most goals in a Champions League match, 5, against Leverkusen in 2012. He was the first, and Luiz Adriano and Haaland have since matched it.
- Shared: 18 consecutive Champions League seasons with a goal, with Karim Benzema.

**La Liga**

- Most goals (474), assists (192 or 193 depending on the source) and hat-tricks (36).
- Most goals in a season: 50 (2011-12). Most assists in a season: 21 (2019-20).
- Most hat-tricks in a season: 8 (2011-12).
- Most consecutive games scored in: 21, which included scoring against all 19 opponents in a row.
- Most direct free-kick goals: 39.
- Most appearances by a foreign player: 520.
- The only player to finish as La Liga's top scorer and top assister in the same season, three seasons running.

**Barcelona**

- Most goals (672), assists (269), appearances (778), wins (542), hat-tricks (48) and trophies (35).
- Most goals in El Clásico, for either side: 26. Most assists in El Clásico: 14.

**MLS and Inter Miami**

- Most assists in an MLS game: 5, and most goal contributions in one: 6, against the New York Red Bulls in 2024.
- Most goal contributions in one MLS playoff run: 15 (2025).
- The fastest to 100 regular-season goal contributions: 64 games.
- The first player with 18 goals and 18 assists in one regular season (2025).
- Leagues Cup all-time top scorer: 14 goals.
- Inter Miami's all-time top scorer (102) and assister (56). He is the all-time leader in both for three teams: Barcelona, Argentina and Inter Miami.
