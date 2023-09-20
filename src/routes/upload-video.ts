import { FastifyInstance } from "fastify";
import { fastifyMultipart } from '@fastify/multipart'
import { prisma } from "../lib/prisma";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from 'node:fs';
import { pipeline } from 'node:stream'; //stream is a way to learn or write data gradually
import { promisify } from "node:util";

//path, ls, crypto, http, util, stream are internal modules from node

const pump = promisify(pipeline) // promisify makes that an old function (pipeline) that uses callback, can use promises

export async function uploadVideoRoute(app: FastifyInstance) {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1_048_576 * 25, // 25mb
        }
    })

    app.post('/videos', async (req, res) => {
        const data = await req.file()

        if (!data) {
            return res.status(400).send({ error: 'video file mus be uploaded.' })
        }

        const extension = path.extname(data.filename)

        if (extension !== '.mp3') {// the conversion of the video to audio will happen on front-end by browser
            return res.status(400).send({ error: 'Invalid file format. Please insert a video ".mp4"' })
        }

        const fileBaseName = path.basename(data.filename, extension)
        const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
        const uploadDestiny = path.resolve(__dirname, '../../tmp', fileUploadName)

        await pump(data.file, fs.createWriteStream(uploadDestiny))

        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDestiny,
            }
        })

        return {
            video,
        }

    })
}