import {FilePath} from "./file-path.value-object"
import {LineRange} from "./line-range.value-object"

/**
 * Input contract for creating code chunk value object.
 */
export interface ICreateCodeChunkProps {
    readonly content: string
    readonly filePath: FilePath
    readonly lineRange: LineRange
    readonly language: string
}

/**
 * Immutable code fragment used for embedding generation workflows.
 */
export class CodeChunk {
    private readonly rawContent: string
    private readonly chunkFilePath: FilePath
    private readonly chunkLineRange: LineRange
    private readonly chunkLanguage: string

    /**
     * Creates immutable code chunk.
     *
     * @param props Validated chunk props.
     */
    private constructor(props: ICreateCodeChunkProps) {
        this.rawContent = props.content
        this.chunkFilePath = props.filePath
        this.chunkLineRange = props.lineRange
        this.chunkLanguage = props.language
        Object.freeze(this)
    }

    /**
     * Creates code chunk from raw props.
     *
     * @param props Raw chunk props.
     * @returns Immutable code chunk.
     * @throws Error When content is empty after trim.
     */
    public static create(props: ICreateCodeChunkProps): CodeChunk {
        if (props.content.trim().length === 0) {
            throw new Error("CodeChunk content cannot be empty")
        }

        return new CodeChunk(props)
    }

    /**
     * Raw chunk content.
     *
     * @returns Source code fragment.
     */
    public get content(): string {
        return this.rawContent
    }

    /**
     * File path where chunk belongs.
     *
     * @returns Chunk file path.
     */
    public get filePath(): FilePath {
        return this.chunkFilePath
    }

    /**
     * Inclusive line range covered by chunk.
     *
     * @returns Chunk line range.
     */
    public get lineRange(): LineRange {
        return this.chunkLineRange
    }

    /**
     * Programming language for embedding model routing.
     *
     * @returns Chunk language identifier.
     */
    public get language(): string {
        return this.chunkLanguage
    }
}
