export function restrictProperties(object, propNames) {
  const objKeys = Object.keys(object);
  const filteredKeys = objKeys.filter(key => !propNames.some(prop => key === prop));

  const filteredObject = {};
  filteredKeys.forEach(key => filteredObject[key] = object[key]);
  return filteredObject;
}
