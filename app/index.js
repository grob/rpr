var {indexDir} = require("./config/config");
var {Index} = require("lucindex");
var {Package} = require("./model/package");
var {Document, Field, StringField, TextField, LongField} = org.apache.lucene.document;
var {MultiFieldQueryParser} = org.apache.lucene.queryparser.classic;
var {Version} = org.apache.lucene.util;
var {Analyzer} = org.apache.lucene.analysis;
var {LowerCaseFilter} = org.apache.lucene.analysis.core;
var {PerFieldAnalyzerWrapper} = org.apache.lucene.analysis.miscellaneous;
var {StandardAnalyzer, StandardTokenizer} = org.apache.lucene.analysis.standard;
var {MatchAllDocsQuery, Sort, SortField} = org.apache.lucene.search;
var {NGramTokenFilter} = org.apache.lucene.analysis.ngram;
var {Float} = java.lang;

const PAGE_SIZE = 20;

var NGramAnalyzer = exports.NGramAnalyzer = function(minGram, maxGram) {
    return new Analyzer({
        "createComponents": function(fieldName, reader) {
            var source = new StandardTokenizer(Version.LUCENE_47, reader);
            var filter = new LowerCaseFilter(Version.LUCENE_47, source);
            filter = new NGramTokenFilter(Version.LUCENE_47, filter, minGram, maxGram);
            return new Analyzer.TokenStreamComponents(source, filter);
        }
    });
};

var analyzer = new PerFieldAnalyzerWrapper(new StandardAnalyzer(Version.LUCENE_35), {
    "name_ngrams": new NGramAnalyzer(3, 5)
});

var standardAnalyzer = new StandardAnalyzer(Version.LUCENE_35);

var manager = exports.manager = module.singleton("index", function() {
    return Index.createIndex(indexDir, "rpr", analyzer);
});

var createDocument = exports.createDocument = function(pkg) {
    var doc = new Document();
    var descriptor = JSON.parse(pkg.latestVersion.descriptor);
    doc.add(new StringField("id", pkg._id, Field.Store.YES));
    doc.add(new TextField("name", pkg.name, Field.Store.NO));
    doc.add(new TextField("name_ngrams", pkg.name, Field.Store.NO));
    doc.add(new TextField("description", descriptor.description, Field.Store.NO));
    doc.add(new LongField("modifytime", Math.abs(pkg.modifytime.getTime() / 1000),
            Field.Store.NO));
    for each (var keyword in descriptor.keywords) {
        doc.add(new TextField("keyword", keyword, Field.Store.NO));
    }
    doc.add(new TextField("author", pkg.author.name, Field.Store.NO));
    for each (var maintainer in pkg.maintainers) {
        doc.add(new TextField("maintainer", maintainer.name, Field.Store.NO));
    }
    for each (var contributor in pkg.contributors) {
        doc.add(new TextField("contributor", contributor.name, Field.Store.NO));
    }
    return doc;
};

exports.search = function(q, length, offset) {
    var query = null;
    var sort = new Sort(SortField.FIELD_SCORE);
    if (typeof(q) === "string" && q.length > 0) {
        var parser = new MultiFieldQueryParser(Version.LUCENE_47,
                ["name", "name_ngrams", "description", "keyword", "author", "maintainer", "contributor"],
                standardAnalyzer, {
                    "name": Float.parseFloat(2),
                    "keyword": Float.parseFloat(1.5)
                });
        query = parser.parse(q || "");
    } else {
        query = new MatchAllDocsQuery();
        sort.setSort(new SortField("modifytime", SortField.Type.LONG, true));
    }
    var result = {
        "offset": 0,
        "length": 0,
        "total": 0,
        "hits": []
    };
    var searcher = null;
    var topDocs = null;
    try {
        searcher = manager.getSearcher();
        topDocs = searcher.search(query, null, 50, sort);
    } finally {
        if (searcher !== null) {
            manager.releaseSearcher(searcher);
        }
    }
    if (topDocs.totalHits > 0) {
        result.total = topDocs.totalHits;
        var start = result.offset = Math.min(topDocs.totalHits, Math.max(0, offset || 0));
        var end = Math.min(start + Math.max(0, length || PAGE_SIZE), topDocs.totalHits);
        result.length = end - start;
        for (var i=start; i<end; i+=1) {
            var scoreDoc = topDocs.scoreDocs[i];
            var doc = manager.reader.document(scoreDoc.doc);
            if (doc != null) {
                var pkg = Package.get(doc.getField("id").stringValue());
                if (pkg != null) {
                    result.hits.push(pkg.serialize());
                }
            }
        }
    }
    return result;
};

exports.rebuild = function() {
    manager.removeAll();
    var chunksize = 100;
    var docs = [];
    Package.all().forEach(function(pkg, idx) {
        docs.push(createDocument(pkg));
        if (idx > 0 && idx % chunksize === 0) {
            manager.add(docs);
            docs = [];
        }
    });
    if (docs.length > 0) {
        manager.add(docs);
    }
};