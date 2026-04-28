import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons";
import { DEFAULT_AVATAR_URL } from '../services/firebase/constants';
import { safeImageUri } from '../utils/imageSource';

export type Post = {
  id: string;
  authorId?: string;
  author: string;
  createdAtLabel?: string;
  avatar: string;
  rating: number;
  location: string;
  image: string;
  text: string;
  restaurantName?: string;
  priceRangeLabel?: string;
  openTimeLabel?: string;
  likes: number;
  dislikes: number;
  comments: number;
  liked?: boolean;
  disliked?: boolean;
};

type Props = {
  post: Post;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onComment: (id: string) => void;
  onPressAuthor: (authorId?: string) => void;
  onOpenDetail: (id: string) => void;
};

export default function PostItem({ post, onLike, onDislike, onComment, onPressAuthor, onOpenDetail }: Props) {
  const starCount = Math.max(0, Math.min(5, Math.round(post.rating)));

  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <TouchableOpacity onPress={() => onPressAuthor(post.authorId)} activeOpacity={0.8}>
          <Image source={{ uri: safeImageUri(post.avatar, DEFAULT_AVATAR_URL) }} style={styles.avatar} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerTextWrap} onPress={() => onPressAuthor(post.authorId)} activeOpacity={0.8}>
          <View style={styles.authorRow}>
            <Text style={styles.author}>{post.author}</Text>
            <Text style={styles.timeText}>{post.createdAtLabel ?? 'vừa xong'}</Text>
          </View>
          <View style={styles.ratingRow}>
            {[...Array(starCount)].map((_, i) => (
              <Ionicons key={i} name="star" size={14} color="#FFD400" />
            ))}
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={12} color="#FFD400" />
            <Text style={styles.location}>{post.location}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={() => onOpenDetail(post.id)}>
        <Image source={{ uri: safeImageUri(post.image) }} style={styles.postImage} />
      </TouchableOpacity>

      <View style={styles.postFooter}>
        <Text style={styles.postText}>{post.text}</Text>
        <View style={styles.metaRow}>
          <TouchableOpacity style={styles.metaBtn} onPress={() => onLike(post.id)}>
            <Ionicons name={post.liked ? 'heart' : 'heart-outline'} size={18} color={post.liked ? '#FF3B30' : '#fff'} />
            <Text style={[styles.meta, post.liked && styles.metaLiked]}> {post.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.metaBtn} onPress={() => onDislike(post.id)}>
            <Ionicons
              name={post.disliked ? 'thumbs-down' : 'thumbs-down-outline'}
              size={18}
              color={post.disliked ? '#69A7FF' : '#fff'}
            />
            <Text style={[styles.meta, post.disliked && styles.metaDisliked]}> {post.dislikes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.metaBtn} onPress={() => onComment(post.id)}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
            <Text style={styles.meta}> {post.comments}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    backgroundColor: '#120f0e',
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2b2320',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  headerTextWrap: { flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  author: { color: '#fff', fontWeight: '600', fontSize: 15 },
  timeText: { color: '#8f8f8f', marginLeft: 6, fontSize: 11 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  location: { color: '#b4aca8', fontSize: 12, marginLeft: 4, lineHeight: 16, flex: 1 },
  postImage: {
    width: '100%',
    height: 270,
    backgroundColor: '#222',
    borderRadius: 14,
  },
  postFooter: { padding: 12 },
  postText: { color: '#e7e7e7', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 18 },
  meta: { color: '#fff', fontSize: 14 },
  metaLiked: { color: '#FF3B30' },
  metaDisliked: { color: '#69A7FF' },
});
