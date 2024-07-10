const mongoose = require('mongoose')
const Schema = mongoose.Schema
const User = require('./users.js')
const todoSchema = new Schema({
    task:{
        type:String,
        required:true
    },
    user:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
})

const Todo = mongoose.model('Todo',todoSchema)

module.exports = Todo