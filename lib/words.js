import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const genrePrompts = {
  'General': 'Generate 20 random common English nouns for a word guessing game. Choose words that are easy to describe but fun to guess - things like objects, animals, foods, places, or activities.',
  'Shakespeare': 'Generate 20 words related to Shakespeare for a word guessing game. Include famous plays (Hamlet, Macbeth), characters (Juliet, Puck, Iago), Shakespearean vocabulary (thou, forsooth, bodkin, doth), settings, and well-known themes or quotations.',
  'Science': 'Generate 20 science words for a word guessing game. Include everyday scientific concepts a school student would be learning - forces, elements, cells, planets, energy, weather, and lab equipment. Keep them describable, not overly technical.',
  'Animals': 'Generate 20 animal words for a word guessing game. Include a fun mix of mammals, birds, reptiles, sea creatures, and insects that are easy to describe and act out.',
  'Geography': 'Generate 20 geography words for a word guessing game. Include countries, capital cities, famous landmarks, and landforms (volcano, delta, glacier, peninsula) that students would recognise.',
  'Christmas': 'Generate 20 words related to Christmas for a word guessing game. Include holiday traditions, decorations (tree, lights, stockings), foods, songs, movies, characters (Santa, Rudolph, Grinch), and festive items.',
  'Pop Music': 'Generate 20 words related to pop music for a word guessing game. Include famous artists, iconic songs, albums, music terms, instruments, and pop culture references from various decades.',
  'Movies': 'Generate 20 words related to famous movies for a word guessing game. Include movie titles, famous characters, actors, directors, iconic scenes, and film terminology.',
  'Friends TV Show': 'Generate 20 words related to the TV show Friends for a word guessing game. Include character names (Ross, Rachel, Monica, Chandler, Joey, Phoebe), locations (Central Perk, apartment), catchphrases, running jokes, and memorable items from the show.',
  'The Bible': 'Generate 20 words related to the Bible for a word guessing game. Include notable people (Moses, David, Mary), places (Jerusalem, Bethlehem), objects (ark, manger), and concepts from both Old and New Testament.',
  'US Politics': 'Generate 20 words related to US Politics for a word guessing game. Include political terms, government institutions, famous politicians past and present, landmark legislation, and political concepts.',
  'UK Politics': 'Generate 20 words related to UK Politics for a word guessing game. Include political terms, government institutions (Parliament, Commons, Lords), political parties, famous politicians past and present, and British political concepts.',
};

const difficultyModifiers = {
  easy: ' Make all words simple, common, and concrete - things a child would know. No abstract concepts or obscure references.',
  medium: '',
  hard: ' Make the words challenging - include abstract concepts, technical terms, compound phrases, and more obscure references that would challenge knowledgeable adults.',
};

/**
 * Generate words for a game round using Anthropic API
 * @param {string} genre - The word category/genre
 * @param {string} difficulty - easy, medium, or hard
 * @returns {Promise<string[]>} Array of uppercase words
 */
export async function getWords(genre = 'General', difficulty = 'medium') {
  const basePrompt = genrePrompts[genre] || `Generate 20 words related to "${genre}" for a word guessing game. Include names, places, objects, and concepts that someone familiar with this topic would recognize.`;
  const diffMod = difficultyModifiers[difficulty] || '';
  const prompt = basePrompt + diffMod;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `${prompt} Return only the words, one per line, in uppercase. No numbering, no punctuation, just the words. Words can contain spaces if they are proper nouns or common phrases.`,
        },
      ],
    });

    const words = response.content[0].text
      .split('\n')
      .map(word => word.trim().toUpperCase())
      .filter(word => word.length > 0);

    if (words.length === 0) {
      throw new Error('No valid words generated');
    }

    return words;
  } catch (error) {
    console.error('Error generating words from Anthropic:', error.message);
    // Fallback to hard-coded words if API fails
    return ['APPLE', 'BANANA', 'CHERRY', 'ELEPHANT', 'GUITAR', 'HOSPITAL', 'ICEBERG', 'JUNGLE', 'KITCHEN', 'LIGHTHOUSE'];
  }
}
