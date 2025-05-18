import CryptoJS from 'crypto-js';
import config from '../config/index.js';

class Encryption {
  constructor(key = config.encryption.key) {
    this.key = key;
  }

  encrypt(text) {
    try {
      if (!text) return null;
      const ciphertext = CryptoJS.AES.encrypt(text.toString(), this.key).toString();
      return this.toBase64Url(ciphertext);
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  decrypt(encryptedText) {
    try {
      if (!encryptedText) return null;
      const ciphertext = this.fromBase64Url(encryptedText);
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  // Convert standard Base64 to Base64URL
  toBase64Url(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Convert Base64URL to standard Base64
  fromBase64Url(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return str;
  }

  // Encrypt an ID for use in URLs
  encryptId(id) {
    return this.encrypt(id.toString());
  }

  // Decrypt an ID from URL
  decryptId(encryptedId) {
    const decrypted = this.decrypt(encryptedId);
    if (!decrypted) return null;
    
    // Handle different ID types
    if (!isNaN(decrypted)) {
      return Number(decrypted);
    } else if (decrypted.match(/^[0-9a-fA-F]{24}$/)) {
      // MongoDB ObjectId format
      return decrypted;
    }
    return decrypted;
  }
}

const encryption = new Encryption();
export default encryption;

// Response transformation middleware
const transformResponse = () => {
  return (req, res, next) => {
    const idEncryption = new Encryption();
    const originalJson = res.json;

    res.json = function (data) {
      // Function to recursively encrypt IDs in the response
      const encryptIds = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
          return obj.map(item => encryptIds(item));
        }

        const newObj = { ...obj };
        for (const [key, value] of Object.entries(newObj)) {
          if (key === 'id') {
            newObj[key] = idEncryption.encrypt(value);
          } else if (typeof value === 'object') {
            newObj[key] = encryptIds(value);
          }
        }
        return newObj;
      };

      const transformedData = encryptIds(data);
      return originalJson.call(this, transformedData);
    };

    next();
  };
};

// Request transformation middleware
const decryptRequestIds = () => {
  return (req, res, next) => {
    const idEncryption = new Encryption();

    // Decrypt ID in URL params
    if (req.params.id) {
      req.params.id = idEncryption.decrypt(req.params.id);
    }

    // Decrypt IDs in request body
    if (req.body && typeof req.body === 'object') {
      const decryptIds = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
          return obj.map(item => decryptIds(item));
        }

        const newObj = { ...obj };
        for (const [key, value] of Object.entries(newObj)) {
          if (key === 'id') {
            newObj[key] = idEncryption.decrypt(value);
          } else if (typeof value === 'object') {
            newObj[key] = decryptIds(value);
          }
        }
        return newObj;
      };

      req.body = decryptIds(req.body);
    }

    next();
  };
};

export { transformResponse, decryptRequestIds }; 