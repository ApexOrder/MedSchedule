export default function handler(req, res) {
  try {
    import axios from 'axios'; // or: import axios from 'axios'; if ESM
    res.status(200).json({ version: axios.VERSION });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
