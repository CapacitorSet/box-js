const parse = require("node-html-parser").parse;
const lib = require("./lib.js");
const nodeCrypto = require('crypto').webcrypto;
const fullCrypto = require('crypto')
const nodeUtil = require('util');
const { Buffer } = require('node:buffer');

// Save event listener functions. Event listener callbacks may change
// the state of the DOM and exhibit different functionality when
// called again, so save the callback functions so we can call them
// multiple times.
const listenerCallbacks = [];

// Wrap decodeURIComponent() so that we can (possibly) track some
// string decodes.
const decodedURLs = new Set();
const decodedBase64 = new Set();
decodeURIComponent = (function(_super) {
    return function() {

        // Has a URL?
        const r = _super.apply(this, arguments);
        const urls = r.match(/https?:\/\/[^\s^'^"]+/g);
        if (urls){
            var newUrl = false;
            for (const url of urls) {
                if (!decodedURLs.has(url)) {
                    logUrl('decodeURIComponent()', url);
                    newUrl = true;
                }
                decodedURLs.add(url);
                if (newUrl) {
                    logIOC("decodeURIComponent()", r, "The script decoded a URL with decodeURIComponent().")
                }
            }
        }

        // Has base64?
        const allB64 = r.match(/[A-Za-z0-9\+\/]{100,}[=]{0,2}/g);
        if (allB64){
            var newBase64 = false;
            for (const b64 of allB64) {
                if (!decodedBase64.has(b64)) {
                    newBase64 = true;
                }
                decodedURLs.add(b64);
                if (newBase64) {
                    logIOC("decodeURIComponent()", r, "The script decoded a base64 blob with decodeURIComponent().")
                }
            }
        }
        
        // Done.
        return r;
    };         

})(decodeURIComponent);

// Dummy event to use for faked event handler calls.
const dummyEvent = {

    // For debugging.
    __name: "dummyEvent",
    
    // A boolean value indicating whether or not the event bubbles up through the DOM.
    bubbles: true,

    // A boolean value indicating whether the event is cancelable.
    cancelable: true,

    //A boolean indicating whether or not the event can bubble across
    //the boundary between the shadow DOM and the regular DOM.
    composed: true,

    // A reference to the currently registered target for the
    // event. This is the object to which the event is currently
    // slated to be sent. It's possible this has been changed along
    // the way through retargeting.
    currentTarget: "??",

    // Indicates whether or not the call to event.preventDefault() canceled the event.
    defaultPrevented: false,

    // Indicates which phase of the event flow is being processed. It
    // is one of the following numbers: NONE, CAPTURING_PHASE,
    // AT_TARGET, BUBBLING_PHASE.
    eventPhase: 1, // CAPTURING_PHASE

    // Indicates whether or not the event was initiated by the browser
    // (after a user click, for instance) or by a script (using an
    // event creation method, for example).
    isTrusted: true,

    // A reference to the object to which the event was originally
    // dispatched.
    target: {
        closest: function() { return false; },
    },

    // The time at which the event was created (in milliseconds). By
    // specification, this value is time since epoch—but in reality,
    // browsers' definitions vary. In addition, work is underway to
    // change this to be a DOMHighResTimeStamp instead.
    timeStamp: 1702919791198,

    // The name identifying the type of the event.
    type: "FILL IN BASED ON FAKED HANDLER",
    
    // For Key events.
    key: 97, // "a"

    stopPropagation: function() {},
    stopImmediatePropagation: function() {},
    preventDefault: function() {},
    composedPath: function() {
        return {
            includes: function() { return false; },
        };
    },
    path: "I'm an event path!",
    data: {
	type: "???",
    },
};
event = dummyEvent;

// Handle Blobs. All Blob methods in the real Blob class for dumping
// the data in a Blob are asynch and box-js is all synchronous, so
// rather than rewriting the entire tool to be asynch we are just
// stubbing out a simple Blob class that is synchronous.
class Blob {
    constructor(data, type) {
        this.raw_data = data;
        // Convert to a data string if this is an array of bytes.
        this.data = "";
        var flat = [];
        for (let i = 0; i < data.length; i++) {
            if ((Array.isArray(data[i])) || (data[i].constructor.name == "Uint8Array")) {
                for (let j = 0; j < data[i].length; j++) {
                    flat.push(data[i][j]);
                }
            }
            if (typeof(data[i]) == "string") {
                for (let j = 0; j < data[i].length; j++) {
                    flat.push(data[i].charCodeAt(j));
                }
            }
        }
        if (!flat.some(i => (!Number.isInteger(i) || (i < 0) || (i > 255)))) {
            for (let i = 0; i < flat.length; i++) {
                this.data += String.fromCharCode(flat[i]);
            };
        };
    };

    toString() { return this.data };

    charAt(x) { return this.toString().charAt(x); };

    static charAt() { return ""; };

    // For debugging.
    __name = "Blob";
};
Object.prototype.Blob = Blob;

// Simple Enumerator class implementation.
class Enumerator {
    constructor(collection) {
        if (typeof(collection.length) == "undefined") throw "Enumerator collection has no .length attr";
        this.collection = collection;
        this.currIndex = 0;
    };

    atEnd() {
        return (this.currIndex >= this.collection.length);
    };

    moveNext() {
        this.currIndex++;
    };

    item() {
        if (this.atEnd()) throw "Over end of all Enumerator data";
        return this.collection[this.currIndex];
    };

    // For debugging.
    __name = "Enumerator";
};

// JScript VBArray class.
class VBArray {

    constructor(values) {
        this.values = values;
    };

    getItem(index) {
        return this.values[index];
    };

    // For debugging.
    __name = "VBArray";
};

function btoa(data) {
    if (typeof(data) == "undefined") return "";
    return Buffer.from(data, 'binary').toString('base64')
}

// atob() taken from abab.atob.js .

/**
 * Implementation of atob() according to the HTML and Infra specs, except that
 * instead of throwing INVALID_CHARACTER_ERR we return null.
 */
function atob(data) {
  // Web IDL requires DOMStrings to just be converted using ECMAScript
  // ToString, which in our case amounts to using a template literal.
  data = `${data}`;
  // "Remove all ASCII whitespace from data."
  data = data.replace(/[ \t\n\f\r]/g, "");
  // "If data's length divides by 4 leaving no remainder, then: if data ends
  // with one or two U+003D (=) code points, then remove them from data."
  if (data.length % 4 === 0) {
    data = data.replace(/==?$/, "");
  }
  // "If data's length divides by 4 leaving a remainder of 1, then return
  // failure."
  //
  // "If data contains a code point that is not one of
  //
  // U+002B (+)
  // U+002F (/)
  // ASCII alphanumeric
  //
  // then return failure."
  if (data.length % 4 === 1 || /[^+/0-9A-Za-z]/.test(data)) {
    return null;
  }
  // "Let output be an empty byte sequence."
  let output = "";
  // "Let buffer be an empty buffer that can have bits appended to it."
  //
  // We append bits via left-shift and or.  accumulatedBits is used to track
  // when we've gotten to 24 bits.
  let buffer = 0;
  let accumulatedBits = 0;
  // "Let position be a position variable for data, initially pointing at the
  // start of data."
  //
  // "While position does not point past the end of data:"
  for (let i = 0; i < data.length; i++) {
    // "Find the code point pointed to by position in the second column of
    // Table 1: The Base 64 Alphabet of RFC 4648. Let n be the number given in
    // the first cell of the same row.
    //
    // "Append to buffer the six bits corresponding to n, most significant bit
    // first."
    //
    // atobLookup() implements the table from RFC 4648.
    buffer <<= 6;
    buffer |= atobLookup(data[i]);
    accumulatedBits += 6;
    // "If buffer has accumulated 24 bits, interpret them as three 8-bit
    // big-endian numbers. Append three bytes with values equal to those
    // numbers to output, in the same order, and then empty buffer."
    if (accumulatedBits === 24) {
      output += String.fromCharCode((buffer & 0xff0000) >> 16);
      output += String.fromCharCode((buffer & 0xff00) >> 8);
      output += String.fromCharCode(buffer & 0xff);
      buffer = accumulatedBits = 0;
    }
    // "Advance position by 1."
  }
  // "If buffer is not empty, it contains either 12 or 18 bits. If it contains
  // 12 bits, then discard the last four and interpret the remaining eight as
  // an 8-bit big-endian number. If it contains 18 bits, then discard the last
  // two and interpret the remaining 16 as two 8-bit big-endian numbers. Append
  // the one or two bytes with values equal to those one or two numbers to
  // output, in the same order."
  if (accumulatedBits === 12) {
    buffer >>= 4;
    output += String.fromCharCode(buffer);
  } else if (accumulatedBits === 18) {
    buffer >>= 2;
    output += String.fromCharCode((buffer & 0xff00) >> 8);
    output += String.fromCharCode(buffer & 0xff);
  }
  // "Return output."
  return output;
}
/**
 * A lookup table for atob(), which converts an ASCII character to the
 * corresponding six-bit number.
 */
function atobLookup(chr) {
  if (/[A-Z]/.test(chr)) {
    return chr.charCodeAt(0) - "A".charCodeAt(0);
  }
  if (/[a-z]/.test(chr)) {
    return chr.charCodeAt(0) - "a".charCodeAt(0) + 26;
  }
  if (/[0-9]/.test(chr)) {
    return chr.charCodeAt(0) - "0".charCodeAt(0) + 52;
  }
  if (chr === "+") {
    return 62;
  }
  if (chr === "/") {
    return 63;
  }
  // Throw exception; should not be hit in tests
  return undefined;
}

function extractJSFromHTA(s) {
    const root = parse("" + s);
    items = root.querySelectorAll('script');
    r = "";
    var chunkNum = 0;
    for (let i1 = 0; i1 < items.length; ++i1) {
        item = items[i1];
        for (let i2 = 0; i2 < item.childNodes.length; ++i2) {
            chunkNum += 1;
            child = item.childNodes[i2]
            attrs = ("" + child.parentNode.rawAttrs).toLowerCase();
            if (!attrs.includes("vbscript")) {
                r += "// Chunk #" + chunkNum + "\n" + child._rawText + "\n\n";
            }
        }
    }
    return r;
}

const fakeUrl = 'http://mylegitdomain.com:2112/and/i/have/a/path.php#tag?var1=12&var2=checkout&ref=otherlegitdomain.moe';
var __location = {

    // For debugging.
    __name: "__location",
    
    /*
      Location.ancestorOrigins
      Is a static DOMStringList containing, in reverse order, the origins
      of all ancestor browsing contexts of the document associated with
      the given Location object.
    */
    ancestorOrigins: '',
    
    /* 
       Location.href
       Is a stringifier that returns a USVString containing the entire
       URL. If changed, the associated document navigates to the new
       page. It can be set from a different origin than the associated
       document.
    */
    get href() {
        if (typeof(this._href) === "undefined") this._href = fakeUrl;
        return this._href;
    },
    set href(url) {
	if (url) {
	    url = "" + url;
	    url = url.replace(/\r?\n/g, "");
	    if (url.startsWith("file:")) return;
            if (url.startsWith("//")) {
                url = "https:" + url;
            }
            this._href = url;
            logIOC('HREF Location', {url}, "The script changed location.href.");
	    logUrl('HREF Location', url);
	}
    },

    /* 
       Location.protocol
       Is a USVString containing the protocol scheme of the URL, including
       the final ':'.
    */
    protocol: 'http:',

    /* 
       Location.host
       Is a USVString containing the host, that is the hostname, a ':', and
       the port of the URL.
    */
    host: 'mylegitdomain.com:2112',

    /* 
       Location.hostname
       Is a USVString containing the domain of the URL.
    */
    hostname: 'mylegitdomain.com',

    /* 
       Location.port
       Is a USVString containing the port number of the URL.
    */
    port: '2112',

    /* 
       Location.pathname
       Is a USVString containing an initial '/' followed by the path of the URL.
    */
    pathname: '/and/i/have/a/path.php',

    /* 
       Location.search
       Is a USVString containing a '?' followed by the parameters or
       "querystring" of the URL. Modern browsers provide URLSearchParams
       and URL.searchParams to make it easy to parse out the parameters
       from the querystring.
    */
    search: '',

    /* 
       Location.hash
       Is a USVString containing a '#' followed by the fragment identifier
       of the URL.
    */
    get hash() {
        // Return a fake fragment ID if location is not set.
        if (typeof(this._href) === "undefined") {
            var r = '#foo@bar.baz';
            return r;
        };
        // Return the actual fragment ID if we have one.
        const i = this._href.indexOf("#");
        var r = "";
        if (i >= 0) r = this._href.slice(i);
        return r;
    },

    /* 
       Location.origin Read only
       Returns a USVString containing the canonical form of the origin of
       the specific location.
    */
    origin: 'http://mylegitdomain.com:2112',

    replace: function (url) {
        logIOC('Window Location', {url}, "The script changed the window location URL.");
	logUrl('Window Location', url);
    },

    // The location.reload() method reloads the current URL, like the Refresh button.
    reload: function() {},

    // box-js specific. Used to tell when window.location is used as a string.
    toString: function() {
        // Should return the URL (href) but looks like some JS malware
        // expects this to be the file URL for the sample.        
        //return this.href;
        return "file:///C:\Users\User\AppData\Roaming\CURRENT_SCRIPT_IN_FAKED_DIR.js"
    },
};

// Track setting the current HREF by direct assignments to location.
Object.defineProperty(Object.prototype, "__define", {
    value: function(name, descriptor){
        Object.defineProperty(this, name, descriptor);
    }
});

__define("location",
       {
	   get: function() { return __location; },
	   set: function(url) {
	       if (url) {
		   __location.href = url;
	       }
	   },
       });

tagNameMap = {
    /* !! ADD TAG TO VALUE MAPPINGS HERE !! */
};

function __makeFakeElem(data) {

    var func = function(content) {
        logIOC('DOM Write', {content}, "The script added a HTML node to the DOM");
        const urls = pullActionUrls(content);
        if (typeof(urls) !== "undefined") {
            for (const url of urls) {
                logUrl('Action Attribute', url);
            };
        }
        return __createElement("FAKEELEM");
    };
    
    var fakeDict = {
	// For debugging.
	__name: "fakeDict",
        value : "",
        "contentDocument" : document,
        "appendChild" : func,
        "insertBefore" : func,
        "parentNode" : {
            "appendChild" : func,
            "insertBefore" : func,
            removeChild: function () {return true;},
        },
        "getElementsByTagName" : __getElementsByTagName,
        "title" : "My Fake Title",
        style: {},
	src: fakeUrl,
        navigator: navigator,
        getAttribute: function() {
	    return {
		indexOf: function() { return -1; },
	    };
	},
        setAttribute: function () {},
        addEventListener: function(tag, func) {
            if (typeof(func) === "undefined") return;
            // Simulate the event happing by running the function.
            logIOC("Element.addEventListener()", {event: tag}, "The script added an event listener for the '" + tag + "' event.");
            func(dummyEvent);
            listenerCallbacks.push(func);
        },
        removeEventListener: function(tag) {
            logIOC("Element.removeEventListener()", {event: tag}, "The script removed an event listener for the '" + tag + "' event.");
        },                
        "classList" : {
            add: function() {},
            remove: function() {},
            trigger: function() {},
	    toggle: function() {},
            special: {},
        },
        innerHTML: data,
	_textContent: data,
        get textContent() {
            if (typeof(this._textContent) === "undefined") this._textContent = '';
            return this._textContent;
        },
        set textContent(d) {
            this._textContent = d;
            logIOC('Element Text', {textContent}, "The script changed textContent of an element.");
        },
        item: function() {},
	click: function() {},
        removeChild: function() {return true;},
	remove: function() {},
        append: function() {
            return __createElement("__append__");
        },
	prepend: function() {
            return __createElement("__prepend__");
        },	
        cloneNode: func,
    };
    return fakeDict;
}

function __getElementsByTagName(tag) {
    
    // Do we have data for this tag?
    const tagData = tagNameMap[tag];
    if (tagData) {
        var r = [];
        for (var i = 0; i < tagData.length; i++) {
            r.push(__makeFakeElem(tagData[i]));
        }
        return r;
    }
    else {
        return [__makeFakeElem(""), __makeFakeElem(""), __makeFakeElem("")];
    }
};

var __currSelectedVal = undefined;
var __fakeParentElem = undefined;
var dynamicOnclickHandlers = [];
function __createElement(tag) {
    var fake_elem = {
	// For debugging.
	__name: "fake_elem",
	dataset: (new Proxy({}, {
	    get: (target, name) => name in target ? target[name] : "???"
	})),
        pathname: '/and/i/have/a/path.php',
	checked: true,
	nodeType: 9,
        set onload(func) {
	    lib.info("Script set window.onload function.");
	    func();
        },
        "contentDocument" : document,
	myType: "Element",
        set src(url) {

            // Looks like you can leave off the http from the url.
            if (url.startsWith("//")) url = "https:" + url;

            // Is the script source base64 encoded?
            if (url.startsWith("data:text/html;base64,")) {

                // Strip off the HTML info.
                url = url.slice("data:text/html;base64,".length)

                // Decode the base64.
                url = atob(url);
            }

            // Save the IOC.
            logIOC('Remote Script', {url}, "The script set a remote script source.");
            logUrl('Remote Script', url);
        },
        set onerror(func) {
            // Call the onerror handler.
            func();
        },
        set value(txt) {
            this.val = txt;
        },
        get value() {
            return this.val;
        },
        get href() {
            if (typeof(this._href) === "undefined") this._href = fakeUrl;
            return this._href;
        },
        set href(url) {
	    if (url) {
		url = url.replace(/\r?\n/g, "");
		this._href = url;
		logIOC('HREF Location', {url}, "The script changed location.href.");
		logUrl('HREF Location', url);
	    }
        },
        // Not ideal or close to correct, but sometimes needs a parentNode field.
        parentNode: __fakeParentElem,
        log: [],
	style: {
	    setProperty: function() {},
            display: "",
	},
	appendChild: function() {
            return __createElement("__append__");
        },
        append: function() {
            return __createElement("__append__");
        },
	prepend: function() {
            return __createElement("__prepend__");
        },
        attributes: {},
        setAttribute: function(name, val) {
            this.attributes[name] = val;

            // Setting the source of an element to (maybe) a URL?
            if ((name === "src") || (name === "href")) {
                if (val.startsWith("//")) val = "https:" + val;
                logIOC('Element Source', {val}, "The script set the src or href field of an element.");
	        logUrl('Element Source', val);
            }
        },
        setAttributeNode: function(name, val) {
            if (typeof(val) !== "undefined") {
                this.attributes[name] = val;
            };
            if ((typeof(name.nodeValue !== "undefined")) &&
                (typeof(name.nodeValue.valueOf == "function"))) {
                name.nodeValue.valueOf();
            };
        },
        removeAttributeNode: function(node) {
            // Stubbed out until needed.
        },                
        getAttribute: function(name) {
            return this.attributes[name];
        },
        clearAttributes: function() {
            this.attributes = {};
        },        
        firstChild: {
            nodeType: 3,
        },
        lastChild: {
            nodeType: 3,
        },
	sandbox: {
	    add: function() {},
	},
        getElementsByTagName: __getElementsByTagName,
        getElementsByClassName: __getElementsByTagName,
        // Probably wrong, fix this if it causes problems.
        querySelector: function(tag) {
            return __createElement(tag);
        },
        querySelectorAll: function(selectors) {
            return [__createElement("fake_1"), __createElement("fake_2")];
        },
        select: function() {
            __currSelectedVal = this.val;
        },
	setSelectionRange: function() {
	    // Do we have an element value that might get selected?
	    if (typeof(this.attributes["value"]) !== "undefined") {
		this.val = this.attributes["value"];
		__currSelectedVal = this.val;
	    }	    
	},
        cloneNode: function() {
            //// Actually clone the element (deep copy).
            //return JSON.parse(JSON.stringify(this));
            return __createElement("FAKEELEM");
        },
        toLowerCase: function() {
            return "// NOPE";
        },
        _onclick: undefined,
        set onclick(func) {
            this._onclick = func;
            // Call the click handler.
            func();
        },
        get onclick() {
            return this._onclick;
        },
        click: function() {
            lib.info("click() method called on a document element.");
            if (typeof(this.onclick) !== "undefined") this.onclick();
        },
        insertAdjacentHTML: function(position, content) {
            logIOC('DOM Write', {content}, "The script added a HTML node to the DOM");
            const urls = pullActionUrls(content);
            if (typeof(urls) !== "undefined") {
                for (const url of urls) {
                    logUrl('Action Attribute', url);
                };
            }
        },
        set innerHTML(content) {
            this._innerHTML = content;
            logIOC("Set innerHTML", {content}, "The script set the innerHTML of an element.");

            // Pull action attribute URLs.
            const urls = pullActionUrls(content);
            if (typeof(urls) !== "undefined") {
                for (const url of urls) {
                    logUrl('Action Attribute', url);
                };
            }

            // Pull out onclick JS and run it (eventually).
            const clickHandlers = pullClickHandlers(content);
            if (clickHandlers.length > 0) {
                lib.info("onclick handler code provided in dynamically added HTML.");
                for (const handler of clickHandlers) {

                    // Save the onclick handler code snippets so we can
                    // run them again at the end in case the DOM has
                    // changed.
                    dynamicOnclickHandlers.push(handler);
                }
            }
        },
        get innerHTML() {
            if (typeof(this._innerHTML) === "undefined") this._innerHTML = "";
            return this._innerHTML;
        },
        addEventListener: function(tag, func) {
            if (typeof(func) === "undefined") return;
            // Simulate the event happing by running the function.
            logIOC("Element.addEventListener()", {event: tag}, "The script added an event listener for the '" + tag + "' event.");
            func(dummyEvent);
            listenerCallbacks.push(func);
        },
        removeEventListener: function(tag) {
            logIOC("Element.removeEventListener()", {event: tag}, "The script removed an event listener for the '" + tag + "' event.");
        },        
	removeChild: function() {return true;},
	remove: function() {},
        "classList" : {
            add: function() {},
            remove: function() {},
            trigger: function() {},
	    toggle: function() {},
            // Trivial stubbing. Just say nothing is in the class
            // list. May need a flag to control this.
            contains: function(x) { return false; },
            special: {},
        },
        sheet: {
            insertRule: function() {},
        },
        isVisible: function() { return true; },
        _textContent: '',
	innerText: '',
        get textContent() {
            if (typeof(this._textContent) === "undefined") this._textContent = '';
            return this._textContent;
        },
        set textContent(d) {
            this._textContent = d;
            logIOC('Element Text', {d}, "The script changed textContent of an element.");
        },
        focus: function() {},
        getBoundingClientRect: function() {
            return {
                top: 100,
                bottom: 200,
                left: 100,
                right: 200,
            };
        },
    };
    fake_elem["contentWindow"] = {
        document: document,
    };
    fake_elem.value = "NOT SET";
    return fake_elem;
};
__fakeParentElem = __createElement("FakeParentElem");

// Fake up the then() method. This dict can be returned by methods
// that use the a.b().then() pattern. All this does is call the
// function passed to the then().
const __stubbed_then = {
    // For debugging.
    __name: "__stubbed_then",
    then: function(f) {
        try {
	    f("fake");
        }
        catch (e) {
            lib.info("Stubbed .then() function execution failed. Continuing analysis anyway.");
        }        
    },
}

// Fake up the on() method. This dict can be returned by methods
// that use the a.b().on() pattern. Does nothing.
const __stubbed_on = {
    // For debugging.
    __name: "__stubbed_on",
    on: function(f) {
        // Handle chaining.
        return __stubbed_on;
    },
}

// Track the current text in the clipboard.
var __currClipboardData = "";

// Stubbed global navigator object.
const navigator = {
    // For debugging.
    __name: "navigator",
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    clipboard: {
        writeText : function(txt) {
            logIOC('Clipboard', txt, "The script pasted text into the clipboard.");
	    __currClipboardData = txt;
	    return __stubbed_then;
        },
    },
    connection: {
    },
    cookieEnabled: {
    },
    credentials: {
    },
    deviceMemory: {
    },
    geolocation: {
    },
    javaEnabled: function () {
        return false;
    },
    gpu: {
        requestAdapter: function () {
            return undefined;
        },
    },
    hid: {
    },
    hardwareConcurrency: {
    },
    ink: {
    },
    keyboard: {
    },
    language: "english",
    languages: {
    },
    locks: {
    },
    maxTouchPoints: {
    },
    mediaCapabilities: {
    },
    mediaDevices: {
    },
    mediaSession: {
    },
    onLine: {
    },
    pdfViewerEnabled: {
    },
    permissions: {
    },
    platform: "Win32",
    presentation: {
    },
    serial: {
    },
    serviceWorker: {
    },
    scheduling: {
    },
    storage: {
    },
    userActivation: {
    },
    userAgentData: {
        getHighEntropyValues: function () {
            return __stubbed_then;
        },
    },
    virtualKeyboard: {
    },
    webdriver: false,
    windowControlsOverlay: {
    },
    xr: {
    },
    sendBeacon : function (url) {
        logIOC('navigator.sendBeacon()', {url}, "The script called navigator.sendBeacon() with a URL.");
	logUrl('navigator.sendBeacon()', url);
    },
};

var _generic_append_func = function(content) {
    logIOC('DOM Write', {content}, "The script added a HTML node to the DOM");
    const urls = pullActionUrls(content);
    if (typeof(urls) !== "undefined") {
        for (const url of urls) {
            logUrl('Action Attribute', url);
        };
    }
    return "";
};

// Stubbed NodeIterator object that does nothing.
function _getNodeIterator (root) {
    const r = {
	root: root,
	nextNode: function() { return null; },
    };
    return r;
}

// Fake history object.
var history = {

    // For debugging.
    __name: "history",
    
    replaceState: function(state, unused, url) {
        logIOC('history', url, "The script changed browsing history with history.replaceState().");
        // Let's assume that the current location is being set to this URL.
        location._href = url;
    },
    pushState: function() {},
    length: 10,
    scrollRestoration: "auto",
    state: {},
};

// Stubbed global document object.
generatedElements = {};
var document = {
    // For debugging.
    __name: "document",
    documentMode: 8, // Fake running in IE8
    nodeType: 9,
    scripts: [],
    characterSet: "UTF-8",
    title: "A Web Page",
    referrer: 'https://www.bing.com/',
    body: __createElement("__document_body__"),
    location: location,
    readyState: "complete",
    head: {
        innerHTML: "",
        append: _generic_append_func,
        appendChild: _generic_append_func,
        prepend: _generic_append_func,
    },
    _onclick: undefined,
    set onclick(func) {
        this._onclick = func;
        // Call the click handler.
        func();
    },
    get onclick() {
        return this._onclick;
    },
    _onmousemove: undefined,
    set onmousemove(func) {
        this._onmousemove = func;
        // Call the click handler.
        func();
    },
    get onmousemove() {
        return this._onmousemove;
    },    
    defaultView: {
	history: history,
	location: __location,
	addEventListener: function(tag, func) {
            if (typeof(func) === "undefined") return;
            // Simulate the event happing by running the function.
            logIOC("document.defaultView..addEventListener()", {event: tag}, "The script added an event listener for the '" + tag + "' event.");
            func(dummyEvent);
            listenerCallbacks.push(func);
        },
        getComputedStyle: function(){
            return {
                getPropertyValue: function() { return "none"; },
            };
        },
    },
    set cookie(val) {
        this._cookie = val;
        logIOC('document.cookie', val, "The script set a cookie.");
    },
    get cookie() {
        if (typeof(this._cookie) === "undefined") this._cookie = "";
        return this._cookie;
    },
    ready: function(func) {
        func();
    },
    elementCache : {},
    execCommand : function(cmd) {
        if ((cmd == "copy") && (typeof(__currSelectedVal) !== "undefined")) {
            logIOC('Clipboard', __currSelectedVal, "The script pasted text into the clipboard.");
	    __currClipboardData = __currSelectedVal;
        }
    },
    getElementById : function(id) {

	// Normalize ID.
	if (id.startsWith(".")) id = id.slice(1);
	
        // Already looked this up?
        if (typeof(this.elementCache[id]) !== "undefined") return this.elementCache[id];
        
        var char_codes_to_string = function (str) {
            var codes = ""
            for (var i = 0; i < str.length; i++) {
                codes += String.fromCharCode(str[i])
            }
            return codes
        }

        /* IDS_AND_DATA */
        
        if (typeof(ids) != "undefined") {

	    // Look for it in ID map.
            for (var i = 0; i < ids.length; i++) {
                if (char_codes_to_string(ids[i]) == id) {
                    var r = __createElement(id);
                    r.innerHTML = char_codes_to_string(data[i]);
                    r.innerText = char_codes_to_string(data[i]);
                    r.getAttribute = function(attrId) {
                        return this.attrs[attrId];
                    };
                    r.attrs = attrs[i];
                    this.elementCache[id] = r;
                    r.val = jqueryVals[id];
                    if ((typeof(r.val) == "undefined") || (r.val == "")) r.val = "legituser@mylegitdomain.com";
                    return r;                    
                }
            }

            // Maybe just tracked as attr?
	    for (var i = 0; i < attrs.length; i++) {
		if ((attrs[i].class === id) || ((attrs[i].id === id))) {
                    var r = __createElement(id);
                    r.value = attrs[i].value;
                    if ((typeof(r.value) == "undefined") || (r.value == "")) r.value = "legituser@mylegitdomain.com";
		    return r;
		}
	    }
            
        }

        // Have we already made a fake element for this ID?
        if (typeof(generatedElements[id]) !== "undefined") return generatedElements[id];
        
        // got nothing to return. Make up some fake element and hope for the best.
        var r = __createElement(id);
        r.val = jqueryVals[id];
        if (typeof(r.val) == "undefined") r.val = "legituser@mylegitdomain.com";
	r.prepend = function() {};
        generatedElements[id] = r;
        return r;
    },
    style: {
        "display" : "none",
    },
    className: "",
    documentElement: {
        style: {},
        className: "",
    },
    write: function (content) {
        logIOC('DOM Write', {content}, 'The script wrote to the DOM')
        const urls = pullActionUrls(content);
        if (typeof(urls) !== "undefined") {
            for (const url of urls) {
                logUrl('Action Attribute', url);
            };
        }
        eval.apply(null, [extractJSFromHTA(content)]);
    },
    writeln: function (content) {
        this.write(content);
    },
    appendChild: function(content) {
        logIOC('DOM Write', {content}, "The script appended an HTML node to the DOM")
        const urls = pullActionUrls(content);
        if (typeof(urls) !== "undefined") {
            for (const url of urls) {
                logUrl('Action Attribute', url);
            };
        }
        eval(extractJSFromHTA(content));
    },
    insertBefore: function(node) {
	logIOC('DOM Insert', {node}, "The script inserted an HTML node on the DOM")
        eval(extractJSFromHTA(node));
    },
    getElementsByTagName: __getElementsByTagName,
    getElementsByName: __getElementsByTagName,
    getElementsByClassName: __getElementsByTagName,
    createDocumentFragment: function() {
        return __createElement("__doc_fragment__");
    },
    createElement: __createElement,
    createElementNS: __createElement,
    createTextNode: function(text) {},
    addEventListener: function(tag, func) {
        if (typeof(func) === "undefined") return;
        // Simulate the event happing by running the function.
        logIOC("Document.addEventListener()", {event: tag}, "The script added an event listener for the '" + tag + "' event.");
        func(dummyEvent);
        listenerCallbacks.push(func);
    },
    removeEventListener: function(tag) {
        logIOC("Document.removeEventListener()", {event: tag}, "The script removed an event listener for the '" + tag + "' event.");
    },
    createAttribute: function(name) {
        logIOC('Document.createAttribute()', {name}, "The script added attribute '" + name + "' to the document.");
        return __createElement(name);
    },
    querySelector: function(selectors) {
        logIOC('Document.querySelector()', {selectors}, "The script queried the DOM for selectors '" + selectors + "' .");
	return document.getElementById(selectors);
    },
    querySelectorAll: function(selectors) {
        logIOC('Document.querySelector()', {selectors}, "The script queried the DOM for selectors '" + selectors + "' .");
	return [document.getElementById(selectors)];
    },    
    keypress: function() {},
    createNodeIterator: function(root) {
	return _getNodeIterator(root);
    },
    currentScript: __makeFakeElem(""),
    open: function() {
        return this;
    },
    close: function() {},
};
document.documentElement = document;
const fixit = document;

// Stubbed out URL class.
class URL {

    // For debugging.
    __name = "URL";
    
    constructor(url, base="") {
        if (typeof(url) == "undefined") url = "???";
	this.url = url + base;
        this.hostname = "???";
	this.pathname = '/and/i/have/a/path.php';
        const startHost = this.url.indexOf("://");
        if (startHost >= 0) {
            this.hostname = this.url.slice(startHost + 3);
	    this.pathname = this.hostname;
            const endHost = this.hostname.indexOf("/");
            if (endHost >= 0) {
                this.hostname = this.hostname.slice(0, endHost);
            }
        }
	this.searchParams = {
	    set : function() {},
	};
	
	lib.logIOC("URL()", {method: "URL()", url: this.url}, "The script created a URL object.");
        lib.logUrl("URL()", this.url);
    };

    static _blobCount = 0;
    
    static createObjectURL(urlObject) {

	// If we have a Blob this is probably creating a file download
	// link. Save the "file".
	if (urlObject.constructor.name == "Blob") {
	    const fname = "URL_Blob_file_" + URL._blobCount++;
	    const uuid = lib.getUUID();
	    lib.writeFile(fname, urlObject.data);
	    lib.logResource(uuid, fname, urlObject.data);
	}
    };

    static revokeObjectURL() {};
};

function requestAnimationFrame(func) {
    lib.logIOC("requestAnimationFrame()", {}, "The script ran a function with requestAnimationFrame().");
    func();
}

// Initial stubbed object. Add items a needed.
var screen = {
    // For debugging.
    __name: "screen",
    availHeight: 2000,
    availWidth: 4000,
    colorDepth: 12,
    height: 1000,
    isExtended: false,
    mozBrightness: .3,
    mozEnabled: false,
    orientation: {
        type: "landscape-primary",
    },
    pixelDepth: 9,
    width: 2000,
};

class XMLHttpRequest {

    // For debugging.
    __name = "XMLHttpRequest";
    
    constructor(){
        this.method = null;
        this.url = null;
        this.readyState = 4;
        this.status = 200;
        this.responseText = "";
    };

    _onreadystatechange = undefined;
    get onreadystatechange() {
        return this._onreadystatechange;
    };
    set onreadystatechange(func) {
        lib.info("onreadystatechange() method set for XMLHTTP object.");
        this._onreadystatechange = func;
        if (typeof(func) !== "undefined") {
            try {
                func(this);
            }
            catch (e) {
                logIOC("XmlHttpRequest.onreadystatechange()", "" + e, "Callback function execution failed. Continuing analysis anyway.");
            }
        }
    };
    
    addEventListener(tag, func) {
        if (typeof(func) === "undefined") return;
        // Simulate the event happing by running the function.
        logIOC("XMLHttpRequest.addEventListener()", {event: tag}, "The script added an event listener for the '" + tag + "' event.");
        func(dummyEvent);
        listenerCallbacks.push(func);
    };

    removeEventListener(tag) {
        logIOC("XMLHttpRequest.removeEventListener()", {event: tag}, "The script removed an event listener for the '" + tag + "' event.");
    };
    
    open(method, url) {
        this.method = method;
	// Maybe you can skip the http part of the URL and XMLHTTP
	// still handles it?
	if (url.startsWith("//")) {
	    url = "http:" + url;
	}
        this.url = url;
        lib.logIOC("XMLHttpRequest", {method: method, url: url}, "The script opened a HTTP request.");
        lib.logUrl("XMLHttpRequest", url);
    };

    setRequestHeader(field, val) {
        lib.logIOC("XMLHttpRequest", {field: field, value: val}, "The script set a HTTP header value.");
    };
    
    send() {};
};

dataLayer = [];

class dummyClass {};

// Stubbed intl-tel-input constructor (https://github.com/jackocnr/intl-tel-input).
_intlTelInput = function () {
    return {
	getSelectedCountryData: function () {
	    return {
		iso2: "jp",
		dialCode: "+54",
	    };
	},
	
    };
};

// Stubbed global window object.
function makeWindowObject() {
    var window = {

	// For debugging.
	__name: "window",

	HTMLIFrameElement: dummyClass,
        get park() {
            if (typeof(this._park) === "undefined") this._park = '???';
            return this._park;
        },
        set park(val) {
            logIOC('Window Parking', val, "The script changed window.park.");
        },        
	// Guess you can create ActiveX objects with a window method.
	ActiveXObject: function(objName) {
	    return ActiveXObject(objName);
	},
	blur: function() {},
        setInterval: function() {},
        clearInterval: function() {},
        encodeURIComponent: function(s) {
            return encodeURIComponent(s);
        },
        eval: function(cmd) { return eval(cmd); },
        execScript: function(cmd) {
            lib.runShellCommand(cmd);
        },
	btoa: btoa,
        // Don't know what this is, referenced in some phishing JS.
        svne: "??",
        resizeTo: function(a,b){},
        moveTo: function(a,b){},
        open: function(url) {
            if ((typeof(url) == "string") && (url.length > 0)){
                logIOC('window.open()', {url}, "The script loaded a resource.");
		logUrl('window.open()', url);
            }
        },
        on: function(trigger, func) {
            // Just run the function.
            func();
        },
        close: function(){},
        requestAnimationFrame: requestAnimationFrame,
        matchMedia: function(){ return {}; },
        setInterval:function(){ return {}; },
        atob: function(s){
            return atob(s);
        },
        setTimeout: function(f, i) {
            f();
	},
        Date: Date,
        addEventListener: function(tag, func) {
            if (typeof(func) === "undefined") return;
            // Simulate the event happing by running the function.
            logIOC("Window.addEventListener()", {event: tag}, "The script added an event listener for the '" + tag + "' event.");
            func(dummyEvent);
            listenerCallbacks.push(func);
        },
        removeEventListener: function(tag) {
            logIOC("Window.removeEventListener()", {event: tag}, "The script removed an event listener for the '" + tag + "' event.");
        },
        attachEvent: function(tag, func) {
	    logIOC("Window.attachEvent()", {event: tag}, "The script added an event listener for the '" + tag + "' event.");
            func(dummyEvent);
            listenerCallbacks.push(func);
	},
        getComputedStyle: function(){
            return {
                getPropertyValue: function() { return "none"; },
            };
        },
        createDocumentFragment: function() {},
        createElement: __createElement,    
        screen: screen,
        _location: location,
        get location() {
            return this._location;
        },
        set location(url) {
            this._location.href = url;
        },
        localStorage: {
            // Users and session to distinguish and generate statistics about website traffic. 
            "___utma" : undefined,
            // Users and session to distinguish and generate statistics about website traffic. 
            "__utma" : undefined,
            // Determine new sessions and visits and generate statistics about website traffic. 
            "__utmb" : undefined,
            // Determine new sessions and visits and generate statistics about website traffic. 
            "__utmc" : undefined,
            // Process user requests and generate statistics about the website traffic. 
            "__utmt" : undefined,
            // Store customized variable data at visitor level and generate statistics about the website traffic. 
            "__utmv" : undefined,
            // To record the traffic source or campaign how users ended up on the website. 
            "__utmz" : undefined,
        },
        document: document,
        dataLayer: [],
        navigator: navigator,
        _NavbarView: class _NavbarView {
            constructor() {};    
        },
        URL: URL,
        decodeURIComponent: decodeURIComponent,
        set onload(func) {
	    lib.info("Script set window.onload function.");
	    func();
        },
        get MAIL_URL() {
            if (typeof(this._MAIL_URL) === "undefined") this._href = fakeUrl;
            return this._MAIL_URL;
        },
        set MAIL_URL(url) {
	    // Could be base64.
	    if (atob(url)) url = atob(url);
	    this._MAIL_URL = url;
	    logIOC('MAIL_URL Location', {url}, "The script changed window.MAIL_URL.");
	    logUrl('MAIL_URL Location', url);
        },
        XMLHttpRequest: XMLHttpRequest,
	clipboardData: {
	    getData: function() {
		return __currClipboardData;
	    },
            setData: function (typ, txt) {
                logIOC('Clipboard', txt, "The script pasted text into the clipboard.");
	        __currClipboardData = txt;
	        return __stubbed_then;
            },
	},
        frames: [],
        crypto: nodeCrypto,
        getSelection: function () {},
	postMessage: function () {},
    };

    return window;
}
window = makeWindowObject();
window.self = window;
window.top = window;
self = window;
//window.parent = makeWindowObject();
window.parent = window;
download = window;
const _localStorage = {

    // For debugging.
    __name: "_localStorage",
    
    getItem: function(x) {
        // Can access localStorage with a URL (does not seem local but whatever).
        if (x.startsWith("http://") || x.startsWith("https://")) {
            logIOC('localStorage', {x}, "The script accessed a URL with localStorage.getItem().");
	    logUrl('localStorage', x);
        }
        return null
    },
    setItem: function(x,y) {},
};
window.localStorage = _localStorage;
window.encryptedLocalStorage = _localStorage;
window.String = String;
window.RegExp = RegExp;
window.JSON = JSON;
window.Array = Array;
window.intlTelInput = _intlTelInput;
localStorage = _localStorage;
encryptedLocalStorage = _localStorage;
top = window;
// Probably not right, but gets addEventListener() method.
gBrowser = window;

// Initial stubbed object. Add items a needed.
var ShareLink = {
    // For debugging.
    __name: "ShareLink",
};

// Initial stubbed function. Add items a needed.
function define(path, func) {
    // Run the function.
    if (!(typeof(func) === "function")) return;
    func({}, {}, {}, {}, {});
};
define.amd = true;

// These could be due to a bug in a sample, but added this to
// get analysis to work. Also could be missing globals from other scripts.
wp = {};
wprentals_map_general_start_map = function() {};
googlecode_property_vars = {};
wprentals_map_general_cluster = function() {};
wprentals_map_general_spiderfy = function() {};
wpestate_initialize_poi = function() {};
Codevz_Plus = {};
classList = {
    add: function() {},
    remove: function() {},
    trigger: function() {},
    toggle: function() {},
    special: {},
}
style = {};

// Initial stubbed function. Add items a needed.
function adjustIframes() {};

// Initial jQuery stubbing. Add items a needed.
function serialize() { return '"nope"'; };
function find() {
    return {
	is: function() { return false; },
	val: function() {},
	prop: function() {},
    }
};

// Function form of jQuery().
var funcDict = {
    // For debugging.
    __name: "funcDict",
    on: function(arg1, arg2) {
	if (typeof(arg2) == "function") {
	    arg2(dummyEvent);
	};
	return funcDict;
    },
    serialize: serialize,
    find: find,
    val: function() { return "some@emailaddr.moe" },
    click: function(f) {
	f(dummyEvent);
    },
    scroll: function() {},
    modal: function() {},
    ready: function() {},
    document: function() {},
    load: function() {},
    extend: function() { return {}; },
    attr: function(field) { return ".attr(" + field + ")"; },
    codevzPlus: function() {},
    hasClass: function() { return false; },
    attr: function() {},
    attrHooks: {
        value: {
            get: function() {},
            set: function() {},
        },
    },
    support: {
        boxModel: false,
    },
    boxModel: false,
    ajaxSetup: function() {},
    event: {
        add: function() {},
        remove: function() {},
        trigger: function() {},
        special: {},
    },
    each: function() {},
    one: function() {},
    mouseup: function() {},
    isFunction: function() {},
    data: function() { return "12"; },
    outerHeight: function() {},
    css: function() {
        return {
            html: function (text) {
                logIOC('JQuery html()', {text}, "The script set HTML with JQuery html() method.");
                return {
                    fadeIn: function () {},
                };
            },
        }
    },
    // Probably not jQuery
    avia_sc_messagebox: function() {},
    trigger: function() {},
    width: function() {},
    resize: function() {},
    blur: function() {},
    submit: function(func) {
        func(dummyEvent);
    },
    hide: function() {},
    keypress: function() {},
    animate: function() {},
    show: function() {
        return {
            html: function (text) {
                logIOC('JQuery html()', {text}, "The script set HTML with JQuery html() method.");
                return {
                    fadeIn: function () {},
                };
            },
        };
    },
    html: function() {},
    focus: function() {},
    text: function() {},
    autocomplete: function() {},
};
var jQuery = function(field){
    // Handle things like $(document) by just returning document.
    if ((typeof(field) != "undefined") && (typeof(field) != "string")) {
        return field;
    };
    // If we have $('string') it looks like we should get some JQuery
    // object back.
    return funcDict;
};

// Global object form of jQuery.
$ = jQuery; // Ugh, shorthand name.
jQuery.jquery = "2.6.1";
jQuery.fn = {
    // For debugging.
    __name: "jQuery.fn",
    jquery: "2.6.1",
    extend: function() { return {}; },
    toggle: function() {},
    live: function() {},
    die: function() {},
    load: function() {},
    revolution: {
        is_mobile: function() {},
        is_android: function() {},
    },
    smoothScroll: {},
};
jQuery.extend = function() { return {}; };
jQuery.attr = function() {};
jQuery.attrHooks = {
    value: {
        get: function() {},
        set: function() {},
    },
};
jQuery.support = {
    boxModel: false,
};
jQuery.boxModel = false;
var ajaxurl = __location.href;
jQuery.ajaxSetup = function() {};
jQuery.ajax = function(params) {
    const url = params["url"];
    if (typeof(url) == "undefined") return;
    logIOC('AJAX', {url}, "The script used $.ajax() to hit a URL.");
    logUrl('AJAX', url);    
};
jQuery.event = {
    add: function() {},
    remove: function() {},
    trigger: function() {},
    special: {},
};
jQuery.each = function() {};
jQuery.isFunction = function() {};
jQuery.expr = {
    pseudos: {},
};
jQuery.getJSON = function(url) {
    logIOC('JQuery.getJSON()', {url}, "The script called JQuery.getJSON()");
    logUrl('JQuery.getJSON()', url);
};
jQuery.get = function(url) {
    logIOC('JQuery.get()', {url}, "The script called JQuery.get()");
    logUrl('JQuery.get()', url);
};
// Looks like that can be a window field.
window.jQuery = jQuery

// Initial WebPack stubbing.
globalThis.location = location;
globalThis.importScripts = true;

// Mejs module stubbing.
var mejs = {
    // For debugging.
    __name: "mejs",
    plugins: {},
    Utils: {},
};

// MediaElementPlayer module stubbing.
var MediaElementPlayer = {
    // For debugging.
    __name: "MediaElementPlayer",
    prototype: {},
};

// Vue module stubbing.
class Vue {

    // For debugging.
    __name = "Vue";
    
    constructor() {};    
};
Vue.directive = function() {};
Vue.component = function() {};

// What is this?
var N2R = N2D = function() {};

// No Element class in node-js.
class Element {
    // For debugging.
    name = "Element";
    constructor() {};
    prototype() { return {}; };
};

class _WidgetInfo {
    // For debugging.
    __name = "_WidgetInfo";
    constructor(a1, a2, a3, a4, a5) {};
};

var _WidgetManager = {
    // For debugging.
    __name: "_WidgetManager",
    _Init: function(a1, a2, a3) {},
    _SetDataContext: function(a1) {},
    _RegisterWidget: function(a1, a2) {},
};

// We are acting like cscript when emulating. JS in cscript does not
// implement Array.reduce().
if (WScript.name != "node") {
    Array.prototype.reduce = function(a, b) {
        throw "CScript JScript has no Array.reduce() method."
    };
};

timeoutFuncs = {}
function setTimeout(func, time) {
    if (!(typeof(func) === "function")) return;
    // No recursive loops.
    const funcStr = ("" + func);
    if (typeof(timeoutFuncs[funcStr]) == "undefined") timeoutFuncs[funcStr] = 0;
    if (timeoutFuncs[funcStr] > 300) {
	console.log(funcStr);
        console.log("Recursive setTimeout() loop detected. Breaking loop.")
        return func;
    }
    timeoutFuncs[funcStr]++;
    func();
    return func;
};
function clearTimeout() {};
function setInterval(func, val) {
    if (typeof(func) === "function") {
        func();
    };
};
function clearInterval() {};

// Some JS checks to see if these are defined. Do very basic stubbing
// until better stubbing is needed.
var exports = {};
//var module = {};

// fetch API emulation.
function fetch(url, data) {
    lib.logIOC("fetch", {url: url, data: data}, "The script fetch()ed a URL.");
    lib.logUrl("fetch", url);
    const r = {
	ok : true,
	json : function() { return "1"; },
    };
    const p = new Promise((resolve, reject) => {
        resolve(r);
    });
    return p;
};

// Image class stub.
class Image {

    // For debugging.
    __name = "Image";
    
    set src(url) {

        // Looks like you can leave off the http from the url.
        if (url.startsWith("//")) url = "https:" + url;
        this.url = url;
        lib.logIOC("Image.src", url, "The script set the source of an Image.");
        lib.logUrl("Image.src", url);
    };
}

// Pull URLs from action attributes of HTML.
function pullActionUrls(html) {

    // Sanity check.
    if ((typeof(html) == "undefined") || (typeof(html.match) == "undefined")) return undefined;
    
    // Do we have action attributes?
    const actPat = /(?:action|src)\s*=\s*"([^"]*)"/g;
    const r = [];
    for (const match of html.matchAll(actPat)) {
        var currAct = match[1];
        if (currAct == "//null") continue;
        if (!currAct.startsWith("http") && !currAct.startsWith("//")) continue;
        if (currAct.startsWith("//")) currAct = "https:" + currAct;
        r.push(currAct);
    }

    // Do we have URLs in the action attribute values?
    if (r.length == 0) return undefined;
    return r;
}

// Pull JS from onclick="" HTML element attributes.
function pullClickHandlers(html) {

    // Sanity check.
    if ((typeof(html) == "undefined") || (typeof(html.match) == "undefined")) return [];
    
    // Do we have action attributes?
    const actPat = /onclick\s*=\s*"([^"]+)"/g;
    const r = [];
    for (const match of html.matchAll(actPat)) {
        var currAct = match[1];
        if (currAct == "//null") continue;
        r.push(currAct);
    }

    // Done.
    return r;
}

// Stubbing for chrome object. Currently does very little.
const chrome = {

    // For debugging.
    __name: "chrome",
    
    extension: {
        onMessage: {
            addListener: function () {}
        },            
    },

    runtime : {
        onInstalled: {
            addListener: function (func) {
                func({"reason" : "install"});
            }
        },
        onMessage: {
            addListener: function () {}
        },
        sendMessage : function(info) {
            if (info["url"]) {
                var url = info["url"];
                var method = "??";
                if (info["message"]) method = info["message"];
                lib.logIOC("chrome.runtime.sendMessage", {method: method, url: url}, "The script opened a HTTP request.");
                lib.logUrl("chrome.runtime.sendMessage", url);
            };
        },
        // chrome.runtime.getManifest().version
        getManifest: function() {
            return {
                version: 12,
            }
        },
        setUninstallURL: function (url) {
            logIOC('chrome.runtime.setUninstallURL', {url}, "The script set the uninstall URL for an extension.");
	    logUrl('chrome.runtime.setUninstallURL', url);
        },
	id : "abcdefghijklmnopabcdefghijklmnop",
    },

    tabs: {
        onUpdated: {
            addListener: function (callback) {
                // (tabId, changeInfo, tab)
                info = {
                    url: fakeUrl,
                };
                callback(1, info, "tab1");
            },
        },
        onRemoved: {
            addListener: function () {}
        },
        create: function () {},
    },

    // chrome.action.setBadgeText
    action: {
        setBadgeText: function () {},
    },
    
    commands: {
        onCommand: {
            addListener: function () {}
        },
    },
    
    storage: {

        sync: {
            get: function () {},
        },
        
        local: {
            set: function(data) {
                this._currData = data;
                return __stubbed_then;
            },
            get: function(field, a2) {
                //console.log("GET");
                //console.log(field);
                //console.log(a2);
                if (typeof(this._currData) == "undefined") this._currData = {};
                //return this._currData[field];
                return __stubbed_then;
            },
        },
        onChanged: {
            addListener: function () {}
        },
    }
};

Modernizr = {
    // For debugging.
    __name: "Modernizr",
};

mediaContainer = {
    // For debugging.
    __name: "mediaContainer",
    Click : function () {},
};

function addEventListener(event, func) {
    func(dummyEvent);
    listenerCallbacks.push(func);
}

if (typeof(arguments) === "undefined") {
    var arguments = [];
}

// TODO: Add flag to specify whether to use high or low values.
var randVal = 0.01;
var randomCount = 0;
// Make this deterministic.
Math.random = function() {
    randomCount++;
    if (randomCount < 10) {
	logIOC('Math.random', {}, "Script called Math.random().");
    }
    else {
	randomCount = 11;
    }
    const r = randVal;
    randVal += 0.1;
    if (randVal > 1.0) randVal = 0.01;
    return r;
}

// Fake sessionStorage object.
var sessionStorage = {
    // For debugging.
    __name: "sessionStorage",
    getItem: function() {},
    setItem: function() {},
};

// Stubbed URLSearchParams class.
class URLSearchParams {
    // For debugging.
    __name = "URLSearchParams";
    constructor() {};
    get() {};
    append() {};
}

// Very stubbed NodeFilter "class".
var NodeFilter = {
    FILTER_ACCEPT: 1,
    SHOW_COMMENT: 2,
}

function moveTo() {};
function resizeTo() {};

// Stubbed JWPlayer (video player) support.
// https://jwplayer.com/
function jwplayer(arg) {

    // Constructor?
    if (typeof(arg) !== "undefined") {
        
        // Return a fake JWPlayer object.
        return {
	    // For debugging.
	    __name: "jwplayer1",
            setup: function() {},
            on: function(event, func) {
                func();
            },
            remove: function() {},
        };
    }

    // Maybe static methods?
    return {
	// For debugging.
	__name: "jwplayer2",
        getPosition: function () {
            return 100.0;
        },
        getDuration: function () {
            return 100.0;
        },
        getState: function () {
            return "idle";
        },
        play: function () {},
    }
}

// Stubbed performance object.
performance = {
    // For debugging.
    __name: "performance",
    now: function() { return 51151.43; },
}

// (Very) stubbed DOMParser class.
class DOMParser {

    // For debugging.
    __name = "DOMParser";
    
    parseFromString(content) {
        logIOC("DOMParser", {content}, "DOMParser.parseFromString() called.");

        // Pull action attribute URLs.
        const urls = pullActionUrls(content);
        if (typeof(urls) !== "undefined") {
            for (const url of urls) {
                logUrl('Action Attribute', url);
            };
        }
        
        // Pull out onclick JS and run it (eventually).
        const clickHandlers = pullClickHandlers(content);
        if (clickHandlers.length > 0) {
            lib.info("onclick handler code provided in parsed HTML.");
            for (const handler of clickHandlers) {
                
                // Save the onclick handler code snippets so we can
                // run them again at the end in case the DOM has
                // changed.
                dynamicOnclickHandlers.push(handler);
            }
        }

        // Return a fake "parsed" element.
        return document;
    };
};

// Call all of the dynamically created on click handlers and listener
// callbacks.
function callDynamicHandlers() {

    // On click handlers.
    for (const handler of dynamicOnclickHandlers) {
        try {
            eval(handler);
        }
        catch (e) {
            console.log(e.message);
            console.log(handler);
        }
    }

    // Listener callbacks.
    for (const func of listenerCallbacks) {
        try {
            func(dummyEvent);
        }
        catch (e) {
            console.log(e.message);
            console.log(handler);
        }
    }
}

// Treat console.warn or .error like console.log.
console.warn = console.log;
console.error = console.log;

// TextEncoder support.
const TextEncoder = nodeUtil.TextEncoder;
const TextDecoder = nodeUtil.TextDecoder;

// **********
// Stubbed Node-JS functions.
// **********

// Stubbed Node process package.
var process = {
    // For debugging.
    __name: "process",
    argv: ["arg1", "arg2"],
    exit: function (code) {
	logIOC('process exit()', {code}, "The script called process.exit().");
    },
    on: function (signal, handler) {
        handler();
    },
}
    
// Stubbed Node spawn() function.
function _spawn(file, args) {
    logIOC('process spawn()', {file: file, args: args}, "The script spawned a process with spawn().");
    return {
	unref: function () {},
    };
}

// Stubbed Node fork() function.
function _fork(file, args) {
    logIOC('process fork()', {file: file, args: args}, "The script spawned a process with fork().");
    return {
	unref: function () {},
    };
}

// Stubbed Node execSync() function.
function _execSync(command, options) {
    logIOC('process execSync()/exec()', {command: command, options: options}, "The script spawned a process with execSync() or exec().");
    return "exec command results.";
}

// Stubbed Node net function. See require_override.js.
function _createConnection(info, callback) {

    // Log the connection info.
    logIOC('net.createConnection()', info, "The script made a network connection with net.createConnection().");
    if (typeof(info.host) !== "undefined") {
        var url = "http://" + info.host;
        if (typeof(info.port) !== "undefined") {
            url += ":" + info.port;
        }        
        logUrl('net.createConnection()', url);
    }

    // Call the connection callback function.
    try {
        callback();
    }
    catch (e1) {
        console.log("net.createConnection() callback failed. " + e1.message);
    }    

    // Return a stubbed connection object.
    return {
        setNoDelay: function () {},
        on: function (event, callback) {
            // Call the connection callback function.
            try {
                callback();
            }
            catch (e2) {
                console.log("net connection object callback failed. " + e2.message);
            }
        },
        write: function () {},
    };
}

// Stubbed Node net function. See require_override.js.
function _Socket() {};

// Stubbed Node net function. See require_override.js.
function _createServer() {
    return {
	listen: function () {},
	on: function () {},
	close: function () {},
	address: function () {
	    return {
		port: 80,
	    }
	},
    };
};

// Stubbed Node http package.
var _http = {
    // For debugging.
    __name: "_http",
    request: function (url, options) {

	// Is this a request(url, options) call or a request(options) call?
	if (typeof url !== "string") {

	    // See if host, path, etc. are in the 1st arg
	    // (request(options) call).
	    if (typeof url.hostname === "undefined") return;
	    const host = url.hostname;
	    var path = "";
	    if (typeof url.path !== "undefined") {
		path = url.path;
	    }
	    var port = "";
	    if (typeof url.port !== "undefined") {
		port = ":" + url.port;
	    }

	    // Construct the URL based on the options.
	    options = url;
	    url = "http://" + host + port + path;
	}
	logIOC('http.request()', {url: url, options: options}, "The script made a web request with http.request().");
	lib.logUrl('http.request()', url);
	throw("Fake error");
    },
    get: function(url, headers) {
        logIOC('http.get()', {url: url, headers: headers}, "The script made a web request with http.get().");
	lib.logUrl('http.get()', url);
        return __stubbed_on;
    },
};

// Stubbed Node socket.io-client function.
function _io_client(url) {
    logIOC('socket.io-client()', {url: url}, "The script opened a socket with socket.io-client().");
    lib.logUrl('socket.io-client()', url);
    return {
        on: function (event, handler) {
            handler();
        },
        emit: function () {},
    }
}

// Stubbed Node axios functions.
function _axiosPost(url, data, header) {
    logIOC('axios.post()', {url: url, data: data, header: header}, "The script made a POST request with axios.post().");
    lib.logUrl('axios.post()', url);
    return {
        "data" : "",
    };
}

function _axiosGet(url) {
    logIOC('axios.get()', {url: url}, "The script made a GET request with axios.get().");
    lib.logUrl('axios.get()', url);
    return {
        "data" : "",
    };
}

// Stubbed Node node-machine-id functions.
function _machineId() {
    return "124b0fe518564f7eebb6f2bfcdf20247fac0d6f34d670fb92e09a0fce8169365";
};

function _machineIdSync() {
    return "86753094-cae9-5feb-2112-13f82a04f5e4";
};

// Fake value for Node __dirname global variable.
var __dirname = "C:/Users/legituser/Downloads"

// Stubbed Components object.
const _fakeComponentClass = {
    // For debugging.
    __name: "_fakeComponentClass",
    getService: function() {
        return {
            getCharPref: function() {},
            setCharPref: function() {},
            newURI: function(url) {
                logUrl('Components.classes["..."].getService().newURI()', url);
            },
            getCodebasePrincipal :function() {},
            getLocalStorageForPrincipal: function() {},
        };
    },
};
var Components = {
    // For debugging.
    __name: "Components",
    // Always return the same stubbed results for
    // Components.classes['....'].
    classes: new Proxy({}, {
        get: (target, name) => _fakeComponentClass
    }),
    interfaces: {},
}

// Looks like the _W object may be some Weebly blog functionality?
_W = {
    // For debugging.
    __name: "_W",
    setup_rpc : function() {},
    setup_model_rpc : function() {},
    set securePrefix(domain) {
        // For tracking treat domain as a URL.
        const url = "https://" + domain;
        logIOC('_W.securePrefix', {url}, "The script set _W.securePrefix (Weebly?).");
	logUrl('_W.securePrefix', url);
        this._securePrefix = domain;
    },
    get securePrefix() {
        return this._securePrefix;
    },
}

// MSC (Microsoft Console File) exploit handling JS.
// https://vipre.com/blog/exploiting-microsoft-console-files/?srsltid=AfmBOor7f23IhqGeBT449rXd5hUCuboeencbv-J44b7Ik8CB_8dXq1Qs
var external = {
    // For debugging.
    __name: "external",
    Document: {
	ScopeNamespace: {
	    GetRoot: function() {},
	    GetChild: function() {},
	    GetNext: function() {},
	},
	ActiveView: {
	    ControlObject: ActiveXObject("dom"),
	},
    }
};

// Stubbed crypto class.
const crypto = {
    // For debugging.
    __name: "crypto",
    getRandomValues : function(arr) {
	// Not random so runs are deterministic.
	var r = [];
	for (let i = 0; i < arr.length; i++) {
	    r.push(i);
	}
	return r;
    },
    createDecipheriv: function(a1, a2, a3, a4) {
	return fullCrypto.createDecipheriv(a1, a2, a3, a4);
    },
    randomUUID: function() {
        // We want determistic analysis runs, so return a fixed UUID.
        return "550e8400-e29b-41d4-a716-946658440103";
    },
    subtle: fullCrypto.subtle,
};

// Stubbed MutationObserver class.
class MutationObserver {
    // For debugging.
    __name = "MutationObserver";
    constructor() {};
    observe() {};
};

Node = {
    // For debugging.
    __name: "Node",
    "TEXT_NODE" : 3,
};

// Lottie animation library stubbing.
lottie = {
    loadAnimation: function() {},
};
check_loader = "";

// Node.js process object stubbing.
process.env = {
    USERPROFILE : "C:\Users\YourUsername",    
}
process.platform = "win32";

// Node.js environment info.
this.arch = "x64";
this.path = "C:/Users/legituser/Downloads";

// Don't allow overriding selected console methods.
const _origConsole = console;
var fakeConsole = {

    get log() {
        return _origConsole.log;
    },
    set log(a) {
    },
    get warn() {
        return _origConsole.log;
    },
    set warn(a) {
    },
    get info() {
        return _origConsole.log;
    },
    set info(a) {
    },
    get error() {
        return _origConsole.log;
    },
    set error(a) {
    },
    get exception() {
        return _origConsole.log;
    },
    set exception(a) {
    },
    get table() {
        return _origConsole.log;
    },
    set table(a) {
    },
    get trace() {
        return _origConsole.log;
    },
    set trace(a) {
    },
};
console = fakeConsole;

// Cloudflare turnstile object?
turnstile = {
    render: function (unk1, config) {
        if ((typeof(config) != "undefined") && (typeof(config.callback) == "function")) {
            config.callback();
        }
    },
    reset: function () {},
}

// Google debug (I think?) object.
google = {
    script : {
	init : function(content) {
	    logIOC('google.script.init()', {content}, 'The script loaded HTML via google.script.init()')
	    try {
		loadedInfo = JSON.parse(content);
		if (typeof(loadedInfo.userHtml) !== "undefined") {
		    content = html = loadedInfo.userHtml;
		    logIOC("DOM Write", {content}, "The script added a HTML node to the DOM");
		    const urls = pullActionUrls(html);
		    if (typeof(urls) !== "undefined") {
			for (const url of urls) {
			    logUrl('Action Attribute', url);
			};
		    }
		}
	    }
	    catch (e) { };
	},
    }
};
goog = google;

// Stubbed HTMLElement class.
class HTMLElement {
};

aclib = {
    runPop: function () {},
};

// Stubbed AbortController class.
class AbortController {

    // For debugging.
    __name = "AbortController";

    signal = "???";
    abort() {};
    
};

// Stubbed AbortSignal.
var AbortSignal = {
    timeout : function () { },	
};
