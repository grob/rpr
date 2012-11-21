var {indexDir} = require("./config/config");
var {Index} = require("lucindex");
var {Package} = require("./model/package");
var {Document, Field, NumericField} = org.apache.lucene.document;
var {MultiFieldQueryParser} = org.apache.lucene.queryParser;
var {Version} = org.apache.lucene.util;
var {Analyzer, PerFieldAnalyzerWrapper, LowerCaseFilter} = org.apache.lucene.analysis;
var {StandardAnalyzer, StandardTokenizer} = org.apache.lucene.analysis.standard;
var {MatchAllDocsQuery, Sort, SortField} = org.apache.lucene.search;
var {NGramTokenFilter} = org.apache.lucene.analysis.ngram;
var {Float} = java.lang;

const PAGE_SIZE = 20;

var NGramAnalyzer = exports.NGramAnalyzer = function(minGram, maxGram) {
    return new Analyzer({
        "tokenStream": function(fieldName, reader) {
            var tokenStream = new StandardTokenizer(Version.LUCENE_35, reader);
            tokenStream = new LowerCaseFilter(Version.LUCENE_35, tokenStream);
            tokenStream = new NGramTokenFilter(tokenStream, minGram, maxGram);
            return tokenStream;
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
    doc.add(new Field("id", pkg._id,
            Field.Store.YES, Field.Index.NOT_ANALYZED, Field.TermVector.NO));
    doc.add(new Field("name", pkg.name,
            Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    doc.add(new Field("name_ngrams", pkg.name,
            Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    doc.add(new Field("description", descriptor.description,
            Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    doc.add((new NumericField("modifytime")).setLongValue(Math.abs(pkg.modifytime.getTime() / 1000)));
    for each (var keyword in descriptor.keywords) {
        doc.add(new Field("keyword", keyword,
                Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    }
    doc.add(new Field("author", pkg.author.name,
            Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    for each (var maintainer in pkg.maintainers) {
        doc.add(new Field("maintainer", maintainer.name,
                Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    }
    for each (var contributor in pkg.contributors) {
        doc.add(new Field("contributor", contributor.name,
                Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    }
    return doc;
};

exports.search = function(q, length, offset) {
    var query = null;
    var sort = new Sort(SortField.FIELD_SCORE);
    if (typeof(q) === "string" && q.length > 0) {
        var parser = new MultiFieldQueryParser(Version.LUCENE_35,
                 ["name", "name_ngrams", "description", "keyword", "author", "maintainer", "contributor"],
                standardAnalyzer, {
                    "name": Float.parseFloat(2),
                    "keyword": Float.parseFloat(1.5)
                });
        query = parser.parse(q || "");
    } else {
        query = new MatchAllDocsQuery();
        sort.setSort(new SortField("modifytime", SortField.LONG, true));
    }
    var topDocs = manager.searcher.search(query, null, 50, sort);
    var result = {
        "offset": 0,
        "length": 0,
        "total": 0,
        "hits": []
    };
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