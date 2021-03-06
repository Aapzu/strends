var assert = require('assert')
var proxyquire = require('proxyquire')
var _ = require('underscore')

var DataHand

describe('DataHand', function(){
    var dataHandOptions
    var dataHand

    before(function(){
        dataHandOptions = {
            twitter: {
                consumer_key: "test_consumer_key",
                consumer_secret: "test_consumer_secret",
                access_token_key: "test_access_token_key",
                access_token_secret: "test_access_token_secret"
            },
            streamr: {
                stream_id: "test_stream_id",
                stream_auth: "test_stream_auth"
            }
        }
    })

    it('should create new twitter instance with the given options', function(done){
        var options = {
            twitter: {
                consumer_key: 1
            },
            streamr: 2
        }
        DataHand = proxyquire('../../src/data-hand.js', {
            twitter: function(opts){
                assert.equal(opts.consumer_key, 1)
                done()
            }
        })
        new DataHand(options)
    })

    describe('buildRequest', function(){
        var request
        beforeEach(function(){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){}
            })
            dataHand = new DataHand(dataHandOptions)
        })
        it('must build the request if the words are in a string', function(){
            dataHand.buildRequest("test1,test2,test3")
        })
        it('must build the request if the words are in a list', function(){
            dataHand.buildRequest([
                "test1",
                "test2",
                "test3"
            ])
        })
        it('must use the existing list if the words are undefined', function(){
            dataHand.wordList = {
                "test1": 1,
                "test2": 1,
                "test3": 1
            }
            dataHand.buildRequest()
        })

        afterEach('check the request and list', function(){
            assert(dataHand.request == "test1,test2,test3")
            assert.equal({"test1":1,"test2":1,"test3":1}.toString(), dataHand.wordList.toString())
        })
    })

    describe('addWord', function(){
        beforeEach(function(){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){}
            })
            dataHand = new DataHand(dataHandOptions)
        })

        it('must add the word if it is not in the list', function(){
            dataHand.stream = function(){}
            dataHand.addWord("test")
            assert.equal(_.keys(dataHand.wordList).length, 1)
            assert.equal(dataHand.wordList.test, 1)
        })

        it('must change the number of word to 2 if the word is already in the list', function(){
            dataHand.stream = function(){}
            dataHand.wordList = {test: 1}
            dataHand.addWord("test")
            assert.equal(_.keys(dataHand.wordList).length, 1)
            assert.equal(dataHand.wordList.test, 2)
        })

        it('must call stream', function(done){
            var calls = 0
            dataHand.stream = function(){
                done()
            }
            dataHand.addWord("test")
        })
    })

    describe('addWordList', function() {
        beforeEach(function(){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){}
            })
            dataHand = new DataHand(dataHandOptions)
        })

        it('should add every word in the given list', function(done) {
            var list = ["just", "some", "random", "words", "for", "testing"]
            var i = 0
            dataHand.pushToWordList = function(word) {
                assert.equal(word, list[i])
                i++;
            }
            dataHand.stream = function() {
                done()
            }
            dataHand.addWordList(list)
        })
    })

    describe('removeWord', function(){
        beforeEach(function(){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){}
            })
            dataHand = new DataHand(dataHandOptions)
        })

        it('must remove the word if it is in the list', function(){
            dataHand.stream = function(){}
            dataHand.wordList = {test: 1, test2: 1}
            dataHand.removeWord("test")
            assert.equal(dataHand.wordList.toString(), {"test2":1}.toString())
        })

        it('must do nothing if the word is not in the list', function(){
            dataHand.stream = function(){}
            dataHand.wordList = {test: 1, test2: 1}
            dataHand.removeWord("test3")
            assert.equal(dataHand.wordList.toString(), {test: 1, test2: 1}.toString())
        })

        it('must reduce the amount if the word is in the list more than once', function(){
            dataHand.stream = function(){}
            dataHand.wordList = {test: 10, test2: 2}
            dataHand.removeWord("test")
            dataHand.removeWord("test2")
            assert.equal(dataHand.wordList.toString(), {test: 9, test2: 1}.toString())
        })

        it('must call stream if the removed item was not the last one', function(done){
            dataHand.stream = function(){
                done()
            }
            dataHand.destroy = function(){
                throw "Destroy called!"
            }
            dataHand.wordList = {test: 1, test2: 1}
            dataHand.removeWord("test2")
        })

        it('must call destroy if the removed item was the last one', function(done){
            dataHand.stream = function(){
                throw "Stream called!"
            }
            dataHand.destroy = function(){
                done()
            }
            dataHand.wordList = {test: 1}
            dataHand.removeWord("test")
        })
    })

    describe('parse', function(){
        beforeEach(function(){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){}
            })
            dataHand = new DataHand(dataHandOptions)
        })

        it('must return an empty object if there is no text in the tweet', function(){
            var tweet = {
                id: "test",
                field1: 1,
                field2: 2
            }
            assert.equal(Object.keys(dataHand.parse(tweet)).length, 0)
        })

        it('must return the right kind of object if the tweet text matches', function(){
            dataHand.wordList = {some: 1, words: 1, maybe: 1}
            var tweet = {
                text: "This tweet has words which should attach the focus of the parser."
            }
            assert.equal(dataHand.parse(tweet).words.text, tweet.text)
        })

        it('must be able to match to more than one word', function(){
            dataHand.wordList = {some: 1, words: 1, maybe: 1}
            var tweet = {
                text: "This tweet has words which should maybe attach the focus of the parser."
            }
            assert.equal(dataHand.parse(tweet).words.text, tweet.text)
            assert.equal(dataHand.parse(tweet).maybe.text, tweet.text)
        })

        it('must match also for tweet with different cases', function(){
            dataHand.wordList = {sOme: 1, WORDS: 1, Maybe: 1}
            var tweet = {
                text: "This tweet has wordS which should attach THE focus of the parser."
            }
            assert.equal(dataHand.parse(tweet).words.text, tweet.text)
        })
    })

    describe('stream', function(){
        beforeEach(function(){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){
                    return {
                        stream: function(){}
                    }
                }
            })
            dataHand = new DataHand(dataHandOptions)
        })

        it('must call for buildRequest with the given words', function(done){
            dataHand.buildRequest = function(words){
                if(words == "test")
                    done()
            }
            dataHand.stream("test")
        })

        it('must call Twitter.stream with right parameters', function(done){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){
                    return {
                        stream: function(opts, query, cb){
                            if(opts == "statuses/filter" &&
                            query.track == "test")
                                done()
                        }
                    }
                }
            })
            dataHand = new DataHand(dataHandOptions)
            dataHand.buildRequest = function(words){
                this.request = words
            }
            dataHand.stream("test")
        })

        it('must call processData on "data"', function(){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){
                    return {
                        stream: function(opts, query, cb){
                            cb({
                                on: function(event, cb){
                                    if(event == "data")
                                    setTimeout(function(){
                                        cb()
                                    }, 50)
                                }
                            })
                        }
                    }
                }
            })
            dataHand = new DataHand(dataHandOptions)
            dataHand.processTweet = function(tweet){
                done()
            }
            dataHand.stream("test")
        })
    })

    describe('processTweet', function() {
        beforeEach(function () {
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function () {
                },
                restler: {
                    post: function(){
                        return {
                            on: function(){}
                        }
                    }
                }
            })
            dataHand = new DataHand(dataHandOptions)
        })

        it('must just change the value of limit if the tweet has field limit', function(){
            dataHand.limit = false
            dataHand.processTweet({
                limit: true
            })
            assert(dataHand.limit)
        })

        it('must change the limit value back to false', function(){
            dataHand.limit = false
            dataHand.processTweet({
                limit: true
            })
            dataHand.processTweet({
                test: "test"
            })
            assert(!dataHand.limit)
        })

        it('must parse and post the stringified tweet to right url with right headers', function(done){
            parsed = false
            DataHand = proxyquire('../../src/data-hand.js', {
                restler: {
                    post: function(url, options){
                        assert.equal(url, 'http://data.streamr.com/json')
                        assert.equal(options.headers.Stream, "test_stream_id")
                        assert.equal(options.headers.Auth, "test_stream_auth")
                        assert.equal(options.data, '{"test1":"test1","test2":"test2"}')
                        assert(parsed)
                        done()
                        return {
                            on: function(){}
                        }
                    }
                }
            })
            dataHand = new DataHand(dataHandOptions)
            dataHand.parse = function(tweet){
                parsed = true
                return tweet
            }
            dataHand.processTweet({
                test1: "test1",
                test2: "test2"
            })
            assert(!dataHand.limit)
        })
    })

    describe('isStreaming', function(){
        beforeEach(function(){
            DataHand = proxyquire('../../src/data-hand.js', {
                twitter: function(){
                    return {
                        stream: function(){}
                    }
                }
            })
            dataHand = new DataHand(dataHandOptions)
        })

        it('must return false if there is no stream', function(){
            assert(!dataHand.isStreaming())
        })

        it('must return true if there is a stream', function(){
            dataHand.twitterStream = {}
            assert(dataHand.isStreaming())
        })
    })
})