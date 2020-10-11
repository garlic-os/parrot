interface ParrotErrorParams {
    name: string;
    code: string;
    message: string;
}

export class ParrotError extends Error {
    code: string;

    constructor(params: ParrotErrorParams) {
        super(params.message);
        this.name = params.name;
        this.code = params.code;
    }
}
