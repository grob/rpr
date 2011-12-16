var {indexDir} = require("./config");
var {IndexManager} = require("indexmanager");
var {Document, Field} = org.apache.lucene.document;
var {MultiFieldQueryParser} = org.apache.lucene.queryParser;
var {Version} = org.apache.lucene.util;
var {Analyzer, PerFieldAnalyzerWrapper, LowerCaseFilter} = org.apache.lucene.analysis;
var {StandardAnalyzer, StandardTokenizer} = org.apache.lucene.analysis.standard;
var {MatchAllDocsQuery} = org.apache.lucene.search;
var {NGramTokenFilter} = org.apache.lucene.analysis.ngram;
var {Float} = java.lang;

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

var manager = exports.manager = module.singleton("index", function() {
    return IndexManager.createIndex(indexDir, "index", analyzer);
});

exports.createDocument = function(pkg) {
    var doc = new Document();
    var descriptor = JSON.parse(pkg.latestVersion.descriptor);
    doc.add(new Field("id", pkg._id, Field.Store.YES, Field.Index.NOT_ANALYZED, Field.TermVector.NO));
    doc.add(new Field("name", pkg.name, Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    doc.add(new Field("name_ngrams", pkg.name, Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    doc.add(new Field("description", descriptor.description, Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    for each (var keyword in descriptor.keywords) {
        doc.add(new Field("keyword", keyword, Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    }
    doc.add(new Field("author", pkg.author.name, Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    for each (var maintainer in pkg.maintainers) {
        doc.add(new Field("maintainer", maintainer.name, Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    }
    for each (var contributor in pkg.contributors) {
        doc.add(new Field("contributor", contributor.name, Field.Store.NO, Field.Index.ANALYZED, Field.TermVector.NO));
    }
    return doc;
};

exports.search = function(q) {
    var query = null;
    if (typeof(q) === "string" && q.length > 0) {
        var parser = new MultiFieldQueryParser(Version.LUCENE_35,
                 ["name", "name_ngrams", "description", "keyword", "author", "maintainer", "contributor"],
                analyzer, {
                    "name": Float.parseFloat(2),
                    "keyword": Float.parseFloat(1.5)
                });
        query = parser.parse(q || "");
    } else {
        query = new MatchAllDocsQuery();
    }
    var topDocs = manager.searcher.search(query, null, 50);
    var result = [];
    if (topDocs.totalHits > 0) {
        var topScore = topDocs.getMaxScore();
        for (var i=0; i<topDocs.totalHits; i+=1) {
            var scoreDoc = topDocs.scoreDocs[i];
            if (scoreDoc.score / topScore < 0.5) {
                break;
            }
            var doc = manager.reader.document(scoreDoc.doc);
            if (doc != null) {
                result.push(doc.getField("id").stringValue());
            }
        }
    }
    return result;
};
