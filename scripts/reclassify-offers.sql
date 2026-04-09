-- Reklassifizierung bestehender "Sonstiges Lebensmittel" Angebote
-- Führe dieses Script im Supabase SQL Editor aus

-- Fleisch
UPDATE offers SET category = 'Fleisch'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(hähnchen|huhn|hühnchen|chicken|pute|truthahn|ente|gans|rind|schwein|lamm|kalb|hackfleisch|gehacktes|hack|gulasch|geschnetzeltes|schnitzel|steak|braten|filet|keule|schenkel|brust|wurst|bratwurst|wiener|bockwurst|salami|schinken|speck|bacon|leberkäse|fleischkäse|mettwurst|aufschnitt|mortadella|lyoner|fleisch|geflügel|roulade|frikadelle|bulette|mett|tatar)'
);

-- Fisch & Meeresfrüchte
UPDATE offers SET category = 'Fisch & Meeresfrüchte'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(lachs|forelle|thunfisch|hering|makrele|kabeljau|pangasius|seelachs|rotbarsch|scholle|zander|dorade|wolfsbarsch|garnele|shrimp|krabbe|muschel|tintenfisch|calamari|fischstäbchen|räucherlachs|matjes|sardine|sardelle|anchovis|fisch|meeresfrüchte|scampi|sushi)'
);

-- Käse
UPDATE offers SET category = 'Käse'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(käse|gouda|emmentaler|edamer|mozzarella|parmesan|cheddar|camembert|brie|feta|hirtenkäse|frischkäse|mascarpone|ricotta|gorgonzola|roquefort|gruyère|bergkäse|tilsiter|raclette|halloumi|hüttenkäse|cottage cheese|schmelzkäse|scheibletten|reibekäse|streukäse)'
);

-- Milch & Eier
UPDATE offers SET category = 'Milch & Eier'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(milch|vollmilch|h-milch|frischmilch|joghurt|jogurt|kefir|buttermilch|sahne|schlagsahne|kochsahne|schmand|saure sahne|crème fraîche|creme fraiche|quark|skyr|butter|margarine|eier|freilandeier|bio-eier|pudding|milchreis|grießbrei)'
);

-- Obst
UPDATE offers SET category = 'Obst'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(apfel|banane|orange|birne|kirsche|erdbeere|beere|traube|mango|ananas|melone|zitrone|pflaume|pfirsich|nektarine|kiwi|clementine|mandarine|himbeere|heidelbeere|johannisbeere|brombeere|granatapfel|papaya|feige|dattel|avocado|grapefruit|limette|weintraube|aprikose|zwetschge)'
);

-- Gemüse
UPDATE offers SET category = 'Gemüse'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(tomate|gurke|paprika|zwiebel|karotte|möhre|brokkoli|blumenkohl|zucchini|aubergine|spinat|lauch|porree|sellerie|fenchel|kohlrabi|radieschen|rettich|kürbis|champignon|pilz|salat|eisberg|rucola|feldsalat|kopfsalat|kohl|rotkohl|weißkohl|wirsing|grünkohl|rosenkohl|spargel|bohne|erbse|mais|kartoffel|süßkartoffel|mangold|pak choi|chinakohl|knoblauch|ingwer|rote bete|pastinake)'
);

-- Backwaren
UPDATE offers SET category = 'Backwaren'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(brot|brötchen|semmel|toast|baguette|ciabatta|croissant|brezel|laugenbrezel|knäckebrot|tortilla|wrap|fladenbrot|naan|pita|focaccia|kuchen|torte|gebäck|muffin|donut|berliner|strudel)'
);

-- Nudeln & Reis
UPDATE offers SET category = 'Nudeln & Reis'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(nudel|pasta|spaghetti|penne|fusilli|farfalle|rigatoni|tagliatelle|linguine|lasagne|tortellini|ravioli|gnocchi|spätzle|reis|basmatireis|jasminreis|risotto|couscous|bulgur|quinoa|polenta|grieß|glasnudeln|reisnudeln|udon|ramen)'
);

-- Getränke
UPDATE offers SET category = 'Getränke'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(bier|wein|sekt|prosecco|schnaps|likör|vodka|whisky|rum|gin|saft|orangensaft|apfelsaft|nektar|wasser|mineralwasser|sprudel|cola|fanta|sprite|limo|limonade|eistee|energy|schorle|smoothie|kaffee|espresso|tee|kakao)'
);

-- Snacks & Süßes
UPDATE offers SET category = 'Snacks & Süßes'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(chips|flips|cracker|salzstangen|schokolade|praline|bonbon|gummibärchen|fruchtgummi|lakritze|keks|waffel|riegel|müsliriegel|schokoriegel|eiscreme|magnum|cornetto|popcorn|knabber)'
);

-- Gewürze
UPDATE offers SET category = 'Gewürze'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(gewürz|pfeffer|zimt|kurkuma|paprikapulver|oregano|curry|chili|muskat|koriander|kümmel|senf|ketchup|mayo|mayonnaise|remoulade|sojasauce|sojasoße|tabasco|sriracha|sambal|pesto|essig|balsamico|dressing)'
);

-- Öle & Fette
UPDATE offers SET category = 'Öle & Fette'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(olivenöl|sonnenblumenöl|rapsöl|kokosöl|sesamöl|erdnussöl|distelöl|leinöl|bratöl|speiseöl|pflanzenöl|butterschmalz|schmalz|kokosfett|frittierfett)'
);

-- Konserven
UPDATE offers SET category = 'Konserven'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(konserve|passierte tomaten|passata|fertiggericht|ravioli dose|eintopf|instant|tütensuppe|brühe|bouillon)'
);

-- Haushalt
UPDATE offers SET category = 'Haushalt'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(spülmittel|waschmittel|weichspüler|toilettenpapier|küchenpapier|taschentücher|müllbeutel|alufolie|backpapier|frischhaltefolie|reiniger|allzweckreiniger|glasreiniger|schwamm|lappen|besen)'
);

-- Drogerie
UPDATE offers SET category = 'Drogerie'
WHERE category = 'Sonstiges Lebensmittel'
AND (
  lower(product_name) ~ '(shampoo|duschgel|seife|zahnpasta|zahnbürste|deo|deodorant|bodylotion|handcreme|sonnencreme|rasierer|windel|feuchttücher|wattepads|parfüm|haarspray)'
);

-- Ergebnis prüfen: Wie viele sind noch in "Sonstiges"?
SELECT category, count(*) as anzahl
FROM offers
WHERE valid_until >= CURRENT_DATE
GROUP BY category
ORDER BY anzahl DESC;
