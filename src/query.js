const
    {DOMParser} = require('@xmldom/xmldom'),
    xpath = require('xpath');

module.exports = (xml, query) => {
    const dom = new DOMParser().parseFromString(xml);
    let selectedValues = [];

    if(query === undefined) {
        throw new Error('Must pass an XPath query.');
    }

    try {
        selectedValues = xpath.select(query, dom);
    } catch(err) {
        throw new Error(`Invalid XPath query: ${query}`);
    }

    const output = [];

    if (typeof selectedValues === 'string') {
        output.push({outer: selectedValues, inner: selectedValues});
    } else {
        for (const selectedValue of selectedValues || []) {
            switch (selectedValue.constructor.name) {
                case 'Attr':
                    output.push({outer: selectedValue.toString().trim(), inner: selectedValue.nodeValue});
                    break;
                case 'Element':
                    output.push({outer: selectedValue.toString().trim(), inner: selectedValue.childNodes.toString()});
                    break;
                case 'Text':
                    output.push({outer: selectedValue.toString().trim(), inner: selectedValue.toString().trim()});
                    break;
                default:
                    break;
            }
        }
    }
    return output;
};