import type { ImitateCommandArguments } from "../..";
import type { CommandoClient, CommandoMessage } from "discord.js-commando";

import ImitateCommand from "./imitate";


export default class IntimidateCommand extends ImitateCommand {
	constructor(client: CommandoClient) {
        super(client);
        this.name = "intimidate";
		this.memberName = "intimidate";
        this.description = "**IMITATE BUT WHILE YELLING**";
        this.aliases = [];
    }

    async run(message: CommandoMessage, args: ImitateCommandArguments): Promise<null> {
        super.run(message, args, true);
        return null;
    }
}
