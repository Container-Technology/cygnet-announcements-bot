import { EmbedBuilder } from '@discordjs/builders';
import { sub } from 'date-fns';

export default class Message {
    constructor({
        title,
        description,
        url,
        subdomain,
        instanceTitle,
        icon,
        color
    }: {
        [key: string]: string
    }) {
        const embed = new EmbedBuilder({
            title,
            description,
            color: parseInt(color.replace(/^#/, ''), 16), // Parse hex color
            url,
            author: {
                name: `Cygnet: ${instanceTitle}`,
                icon_url: icon,
                url: subdomain ? `https://${subdomain}.cyg.network` : 'https://cyg.network'
            }
        });

        return { embeds: [embed] }
    }
}