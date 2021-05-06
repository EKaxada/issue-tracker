const express = require("express");
const { ApolloServer, UserInputError } = require("apollo-server-express"); // import apollo server object
const fs = require("fs");
const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const { MongoClient } = require('mongodb')

const url = 'mongodb://localhost/issuetracker'

let db;

let aboutMessage = "Issue Tracker API v1.0";

// scalar type resolver
const GraphQLDate = new GraphQLScalarType({
    name: "GraphQLDate",
    description: "A Date() type in graphQL as a scalar",
    //convert date to string
    serialize(value) {
        return value.toISOString();
    },

    // convert strings to proper dates
    parseLiteral(ast) {
        if (ast.kind == Kind.STRING) {
            const value = new Date(ast.value);
            return isNaN(value) ? undefined : value;
        }
    },
    parseValue(value) {
        const dateValue = new Date(value);
        return isNaN(dateValue) ? undefined : dateValue; // catch invalid date strings
    },
});

// handler functions to resolve queries with real values
const resolvers = {
    Query: {
        about: () => aboutMessage,
        issueList, // resolver function for the Issues
    },
    Mutation: {
        setAboutMessage,
        issueAdd,
    },
    GraphQLDate,
};

function setAboutMessage(_, { message }) {
    return (aboutMessage = message);
}

async function issueList() {
    const issues = await db.collection('issues').find({}).toArray();
    return issues;
}

// function to connect to DB
async function connectToDb() {
    const client = new MongoClient(url, { userNewUrlParser: true });
    await client.connect();
    console.log('Connected to MongoDB at', url)
    db = client.db();
}

// function for writing to DB
async function getNextSequence(name) {
    const result = await db.collection('counters').findOneAndUpdate({ _id: name }, { $inc: { current: 1 } }, { returnOriginal: false })
    return result.value.current;
}

// issueAdd resolver to create new Issue in memory
async function issueAdd(_, { issue }) {
    const errors = [];
    if (issue.title.length < 3) {
        errors.push('Field "title" must be at least 3 characters long.');
    }
    if (issue.status == "Assigned" && !issue.owner) {
        errors.push('Field "owner" is required when status is "Assigned"');
    }
    if (errors.length > 0) {
        throw new UserInputError("Invalid input(s)", { errors });
    }
    issue.created = new Date();
    issue.id = await getNextSequence('issues');
    const result = await db.collection('issues').insertOne(issue);

    const savedIssue = await db.collection('issues').findOne({ _id: result.insertedId });
    return savedIssue;
}

// construction of apollo server with two properties and return a GraphQL server object
const server = new ApolloServer({
    typeDefs: fs.readFileSync("schema.graphql", "utf-8"), // changes schema into string
    resolvers,
});

const app = express();


// install apollo_server as middleware in express
server.applyMiddleware({ app, path: "/graphql" });

// start application after connection to db
(async function() {
    try {
        await connectToDb();
        app.listen(3000, () => {
            console.log("API Server started on port 3000");
        });
    } catch (error) {
        console.log('ERROR:', error)
    }
})();