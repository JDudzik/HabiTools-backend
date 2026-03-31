/* eslint-disable no-param-reassign */
import merge from 'deepmerge';


const itemType = (item) => {
  if (item === true) { return true; }
  if (!item) { return false; }
  if (item === false) { return false; }
  if (item === null) { return false; }
  if (typeof item === 'function') { return false; }

  if (Array.isArray(item)) { return 'array'; }
  if (typeof item === 'object') { return 'object'; }
};

const itemTypeFromObject = (object, key) => itemType(object[key]);

const filteredFalses = raw => Object.keys(raw)
  .filter(key => itemTypeFromObject(raw, key))
  .reduce((obj, key) => {
    obj[key] = raw[key];
    return obj;
  }, {});

const walkObject = (raw) => {
  const cleanedRaw = filteredFalses(raw);
  const itemArray = [];

  Object.keys(cleanedRaw).forEach((key) => {
    const keyType = itemType(cleanedRaw[key]);

    if (keyType === false) { return; }

    if (keyType === true) {
      itemArray.push(key);
    }


    if (keyType === 'array') {
      const filteredArray = cleanedRaw[key].filter(value => typeof value === 'string');
      const joinedValues = `${ key }.[${ filteredArray.join(', ') }]`;
      itemArray.push(joinedValues);
    }


    if (keyType === 'object') {
      const stringedObject = walkObject(cleanedRaw[key]);

      // If length is 0, just push the key
      if (stringedObject.length === 0) {
        itemArray.push(key);
        return;
      }

      itemArray.push(`${ key }.[${ stringedObject }]`);
    }
  });

  return itemArray.join(', ');
};


export const eagerConstructor = (eagerObject = {}) => {

  function modify(additionalObject) {
    if (!additionalObject) {
      eagerObject = {};
      return;
    }

    if (itemType(additionalObject) === 'object') {
      eagerObject = merge(eagerObject, additionalObject);
    }
  }


  function string() {
    const completedString = walkObject(eagerObject);
    if (completedString === '') { return undefined; }

    return `[${ completedString }]`;
  }
  


  return {
    eagerObject,
    modify,
    string,
  };
};
