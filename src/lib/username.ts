


const adj=["happy","sad","angry","joyful","calm","energetic","brave","shy","funny","smart","kind","loyal","honest","friendly","polite","rude","lazy","active","calm","energetic","brave","shy","funny","smart","kind","loyal","honest","friendly","polite","rude","lazy","active"]
const nouns=["ghost", "warrior","ninja","samurai","wizard","knight","archer","hunter","thief","assassin","mage","cleric","paladin","druid","barbarian","monk","rogue","ranger","bard","sorcerer","warlock","artificer","fighter","wizard","knight","archer","hunter","thief","assassin","mage","cleric","paladin","druid","barbarian","monk","rogue","ranger","bard","sorcerer","warlock","artificer"]
const numbers=["1","2","3","4","5","6","7","8","9","0"]
const animals=["cat","dog","bird","fish","lion","tiger","elephant","monkey","bear","wolf","fox","rabbit","deer","horse","cow","sheep","goat","pig","chicken","duck","goose","turkey","parrot","eagle","hawk","owl","sparrow","robin","bluejay","cardinal","goldfinch","hummingbird","penguin","ostrich","flamingo","peacock","swan","duck","goose","turkey","parrot","eagle","hawk","owl","sparrow","robin","bluejay","cardinal","goldfinch","hummingbird","penguin","ostrich","flamingo","peacock","swan"]

export const generateUsername = () =>{
    const randomAdj = adj[Math.floor(Math.random() * adj.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    return `${randomAdj}${randomNoun}${randomNumber}${randomAnimal}`;
}