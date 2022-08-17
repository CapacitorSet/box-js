const parse = require("node-html-parser").parse;

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

var location = {
    
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
    href: 'http://mylegitdomain.com:2112/and/i/have/a/path.php',

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
    hash: '',

    /* 
       Location.origin Read only
       Returns a USVString containing the canonical form of the origin of
       the specific location.
    */
    origin: 'http://mylegitdomain.com:2112',

    replace: function (url) {
        logIOC('Window Location', {url}, "The script changed the window location URL.");
    }
};

var window = {
    eval: function(cmd) { eval(cmd); },
    resizeTo: function(a,b){},
    moveTo: function(a,b){},
    close: function(){},
    atob: function(s){
        return new Buffer(s, 'base64').toString('ascii');
    },
    setTimeout: function(f, i) {},
    location: location,
};

var document = {
    documentMode: 8, // Fake running in IE8
    referrer: 'https://bing.com/',
    location: location,
    //parentNode: window.document.parentNode,
    getElementById : function(id) {

        var char_codes_to_string = function (str) {
            var codes = ""
            for (var i = 0; i < str.length; i++) {
                codes += String.fromCharCode(str[i])
            }
            return codes
        }

        /* IDS_AND_DATA */

        for (var i = 0; i < ids.length; i++) {
            if (char_codes_to_string(ids[i]) == id) {
                return {
                    innerHTML: char_codes_to_string(data[i])
                }
            }
        }

        // got nothing to return
        return {
            innerHTML: ""
        }
    },
    write: function (content) {
        logIOC('DOM Write', {content}, 'The script wrote to the DOM')
        eval.apply(null, [extractJSFromHTA(content)]);
    },
    appendChild: function(node) {
        logIOC('DOM Append', {node}, "The script appended an HTML node to the DOM")
        eval(extractJSFromHTA(node));
    },
    insertBefore: function(node) {
	logIOC('DOM Insert', {node}, "The script inserted an HTML node on the DOM")
        eval(extractJSFromHTA(node));
    },
    getElementsByTagName: function(tag) {
        var func = function(item) {
            logIOC('DOM Append', {item}, "The script appended (appendChild) an HTML node to the DOM");
            return "";
        };

        // Return a dict that maps every tag name to the same fake element.
        fake_dict = {};
        fake_dict = new Proxy(fake_dict, {
            get(target, phrase) { // intercept reading a property from dictionary
                return {"appendChild" : func};
            }
        });
        return fake_dict;
    },
    createElement: function(tag) {
        var fake_elem = {
            set src(url) {
                logIOC('Remote Script', {url}, "The script set a remote script source.");
            },
            log: []
        };
        return fake_elem;
    },
    createTextNode: function(text) {
	    //return window.document.createTextNode(text)
    },
    addEventListener: function(tag, func) {}
};

function atob(s) {
    var b = new Buffer(s, 'base64');
    return b.toString();
};

class _WidgetInfo {
    constructor(a1, a2, a3, a4, a5) {}
}

var _WidgetManager = {
    _Init: function(a1, a2, a3) {},
    _SetDataContext: function(a1) {},
    _RegisterWidget: function(a1, a2) {}
}

var navigator = {
    userAgent: 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.2; WOW64; Trident/6.0; .NET4.0E; .NET4.0C; .NET CLR 3.5.30729; .NET CLR 2.0.50727; .NET CLR 3.0.30729; Tablet PC 2.0; InfoPath.3)'
}

// We are acting like cscript when emulating. JS in cscript does not
// implement Array.reduce().
Array.prototype.reduce = function(a, b) {
    throw "CScript JScript has no Array.reduce() method."
};
