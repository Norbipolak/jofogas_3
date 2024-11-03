function getQuestionMarks(values:any[]):string {
    return values.map(v=>"?").join(",");
}

export default getQuestionMarks;