import { pick, isArray, mapValues } from 'lodash';

const fields = [
  'key',
  'title',
  'tagline',
  'duration',
  'viewOffset',
  'index',
  'parentIndex'
];

const relationships = [
  'currentEpisode',
  'nextEpisode',
  'previousEpisode'
];

function serialize(mediaItem) {
  if (!mediaItem) return null;

  const attributes = pick(mediaItem, fields);

  const serialized = {
    id: mediaItem.ratingKey,
    type: mediaItem.type,
    attributes
  };

  if (mediaItem.meta) {
    const extraItems = pick(mediaItem.meta || {}, relationships);

    serialized.meta = {
      ...mediaItem.meta,
      ...mapValues(extraItems, item => serialize(item))
    };
  }

  return serialized;
}

export default function serializer(data) {
  return (isArray(data)
    ? data.map(serialize)
    : serialize(data)
  );
}
