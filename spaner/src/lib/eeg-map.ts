import type { EegMap, EegMapChannel } from './types';

export type EegElectrodePoint = {
	code: string;
	x: number;
	y: number;
	radius?: number;
};

// Standard 10-05 spherical positions projected to 2D, using the eeg_positions package.
// We render the 10-10 / 10-20 subset used by the current session editor.
export const EEG_LAYOUT_POINTS: EegElectrodePoint[] = [
	{ code: 'Nz', x: 260, y: 62 },
	{ code: 'Fp1', x: 204, y: 149 },
	{ code: 'Fpz', x: 260, y: 139 },
	{ code: 'Fp2', x: 316, y: 149 },
	{ code: 'AF7', x: 154, y: 177 },
	{ code: 'AF3', x: 209, y: 194 },
	{ code: 'AFz', x: 260, y: 199 },
	{ code: 'AF4', x: 311, y: 194 },
	{ code: 'AF8', x: 366, y: 177 },
	{ code: 'F7', x: 114, y: 222 },
	{ code: 'F5', x: 155, y: 236 },
	{ code: 'F3', x: 192, y: 245 },
	{ code: 'F1', x: 227, y: 250 },
	{ code: 'Fz', x: 260, y: 251 },
	{ code: 'F2', x: 293, y: 250 },
	{ code: 'F4', x: 328, y: 245 },
	{ code: 'F6', x: 365, y: 236 },
	{ code: 'F8', x: 406, y: 222 },
	{ code: 'FT7', x: 89, y: 279 },
	{ code: 'FC5', x: 139, y: 288 },
	{ code: 'FC3', x: 182, y: 294 },
	{ code: 'FC1', x: 222, y: 297 },
	{ code: 'FCz', x: 260, y: 298 },
	{ code: 'FC2', x: 298, y: 297 },
	{ code: 'FC4', x: 338, y: 294 },
	{ code: 'FC6', x: 381, y: 288 },
	{ code: 'FT8', x: 431, y: 279 },
	{ code: 'T7', x: 80, y: 342 },
	{ code: 'C5', x: 134, y: 342 },
	{ code: 'C3', x: 179, y: 342 },
	{ code: 'C1', x: 221, y: 342 },
	{ code: 'Cz', x: 260, y: 342 },
	{ code: 'C2', x: 299, y: 342 },
	{ code: 'C4', x: 341, y: 342 },
	{ code: 'C6', x: 386, y: 342 },
	{ code: 'T8', x: 440, y: 342 },
	{ code: 'TP7', x: 89, y: 405 },
	{ code: 'CP5', x: 139, y: 396 },
	{ code: 'CP3', x: 182, y: 390 },
	{ code: 'CP1', x: 222, y: 387 },
	{ code: 'CPz', x: 260, y: 386 },
	{ code: 'CP2', x: 298, y: 387 },
	{ code: 'CP4', x: 338, y: 390 },
	{ code: 'CP6', x: 381, y: 396 },
	{ code: 'TP8', x: 431, y: 405 },
	{ code: 'P7', x: 114, y: 462 },
	{ code: 'P5', x: 155, y: 448 },
	{ code: 'P3', x: 192, y: 439 },
	{ code: 'P1', x: 227, y: 434 },
	{ code: 'Pz', x: 260, y: 433 },
	{ code: 'P2', x: 293, y: 434 },
	{ code: 'P4', x: 328, y: 439 },
	{ code: 'P6', x: 365, y: 448 },
	{ code: 'P8', x: 406, y: 462 },
	{ code: 'PO7', x: 154, y: 507 },
	{ code: 'PO3', x: 209, y: 490 },
	{ code: 'POz', x: 260, y: 485 },
	{ code: 'PO4', x: 311, y: 490 },
	{ code: 'PO8', x: 366, y: 507 },
	{ code: 'O1', x: 204, y: 535 },
	{ code: 'Oz', x: 260, y: 545 },
	{ code: 'O2', x: 316, y: 535 },
	{ code: 'Iz', x: 260, y: 622 },
];

export const EEG_8_CHANNEL_CODES = ['Fz', 'C3', 'Cz', 'C4', 'P3', 'Pz', 'P4', 'Oz'] as const;

export const EEG_16_CHANNEL_CODES = [
	'Fz',
	'FC1',
	'FC2',
	'C3',
	'Cz',
	'C4',
	'CP5',
	'CP1',
	'CP2',
	'CP6',
	'P3',
	'Pz',
	'P4',
	'O1',
	'Oz',
	'O2',
] as const;

export const EEG_SPECIAL_CHANNEL_CODES = ['REF', 'BIAS'] as const;

const displayOrderLookup = new Map(EEG_LAYOUT_POINTS.map((point, index) => [point.code, index + 1]));

export function createEmptyEegMapDraft(name = 'Session EEG Map'): EegMap {
	return {
		id: 'draft',
		name,
		layout_type: '10-10',
		description: 'Electrode-to-channel alignment for this session plan.',
		channels: EEG_LAYOUT_POINTS.map((point, index) => ({
			electrode_code: point.code,
			channel_number: null,
			display_order: index + 1,
		})).concat(
			EEG_SPECIAL_CHANNEL_CODES.map((code, index) => ({
				electrode_code: code,
				channel_number: null,
				display_order: EEG_LAYOUT_POINTS.length + index + 1,
			})),
		),
	};
}

export function mergeEegMapChannels(map: Partial<EegMap> | null | undefined): EegMap {
	const draft = createEmptyEegMapDraft(map?.name ?? 'Session EEG Map');
	const byCode = new Map(
		(map?.channels ?? []).map((channel) => [
			channel.electrode_code,
			{
				...channel,
				display_order: channel.display_order ?? displayOrderLookup.get(channel.electrode_code) ?? 999,
			},
		]),
	);

	return {
		id: map?.id ?? draft.id,
		name: map?.name ?? draft.name,
		layout_type: map?.layout_type ?? draft.layout_type,
		description: map?.description ?? draft.description,
		created_at: map?.created_at,
		updated_at: map?.updated_at,
		channels: draft.channels.map((fallback) => ({
			...fallback,
			...byCode.get(fallback.electrode_code),
		})),
	};
}

export function sortChannels(channels: EegMapChannel[]): EegMapChannel[] {
	return [...channels].sort(
		(left, right) =>
			(left.display_order ?? displayOrderLookup.get(left.electrode_code) ?? 999) -
			(right.display_order ?? displayOrderLookup.get(right.electrode_code) ?? 999),
	);
}

export function getMappedChannelCount(channels: EegMapChannel[]): number {
	return channels.filter((channel) => channel.channel_number !== null).length;
}

export function findDuplicateChannelNumbers(channels: EegMapChannel[]): number[] {
	const counts = new Map<number, number>();
	for (const channel of channels) {
		if (channel.channel_number === null) {
			continue;
		}
		counts.set(channel.channel_number, (counts.get(channel.channel_number) ?? 0) + 1);
	}
	return [...counts.entries()]
		.filter(([, count]) => count > 1)
		.map(([channelNumber]) => channelNumber)
		.sort((left, right) => left - right);
}

export function applyMontagePreset(
	channels: EegMapChannel[],
	codes: readonly string[],
	clearOthers = true,
): EegMapChannel[] {
	const nextNumbers = new Map(codes.map((code, index) => [code, index + 1]));

	return channels.map((channel) => {
		if (nextNumbers.has(channel.electrode_code)) {
			return {
				...channel,
				channel_number: nextNumbers.get(channel.electrode_code) ?? null,
			};
		}

		if (clearOthers) {
			if (EEG_SPECIAL_CHANNEL_CODES.includes(channel.electrode_code as (typeof EEG_SPECIAL_CHANNEL_CODES)[number])) {
				return channel;
			}

			return {
				...channel,
				channel_number: null,
			};
		}

		return channel;
	});
}
