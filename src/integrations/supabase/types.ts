export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          badge_type: string
          earned_at: string | null
          id: string
          profile_id: string | null
        }
        Insert: {
          badge_type: string
          earned_at?: string | null
          id?: string
          profile_id?: string | null
        }
        Update: {
          badge_type?: string
          earned_at?: string | null
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "skills_directory"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      banned_users: {
        Row: {
          banned_at: string | null
          banned_by: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string | null
          banned_by?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string | null
          banned_by?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          post_id: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      event_rsvp: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          profile_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          profile_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          profile_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      flash_amens: {
        Row: {
          created_at: string
          flash_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flash_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flash_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_amens_flash_id_fkey"
            columns: ["flash_id"]
            isOneToOne: false
            referencedRelation: "flashes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_amens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_amens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "skills_directory"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      flashes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          media_url: string | null
          type: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          type: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "skills_directory"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      group_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string
          group_id: string | null
          id: string
          location: string | null
          max_attendees: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date: string
          group_id?: string | null
          id?: string
          location?: string | null
          max_attendees?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string
          group_id?: string | null
          id?: string
          location?: string | null
          max_attendees?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string | null
          id: string
          joined_at: string | null
          profile_id: string | null
          role: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          profile_id?: string | null
          role?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          joined_at?: string | null
          profile_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string | null
          group_id: string | null
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_polls: {
        Row: {
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          group_id: string | null
          id: string
          is_closed: boolean | null
          question: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          is_closed?: boolean | null
          question: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          group_id?: string | null
          id?: string
          is_closed?: boolean | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          group_id: string | null
          id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_projects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_private: boolean | null
          name: string
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          visibility?: string | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          price: number | null
          seller_id: string | null
          seller_phone: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          price?: number | null
          seller_id?: string | null
          seller_phone?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          price?: number | null
          seller_id?: string | null
          seller_phone?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      member_skills: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          level: string | null
          profile_id: string | null
          skill: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          level?: string | null
          profile_id?: string | null
          skill: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          level?: string | null
          profile_id?: string | null
          skill?: string
        }
        Relationships: []
      }
      offline_downloads: {
        Row: {
          downloaded_at: string | null
          episode_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string | null
          episode_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string | null
          episode_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_downloads_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "podcast_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_channels: {
        Row: {
          ban_reason: string | null
          category: string | null
          cover_url: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          is_banned: boolean | null
          is_live: boolean | null
          is_verified: boolean | null
          live_url: string | null
          name: string
          playback_id: string | null
          stream_key: string | null
        }
        Insert: {
          ban_reason?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_banned?: boolean | null
          is_live?: boolean | null
          is_verified?: boolean | null
          live_url?: string | null
          name: string
          playback_id?: string | null
          stream_key?: string | null
        }
        Update: {
          ban_reason?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_banned?: boolean | null
          is_live?: boolean | null
          is_verified?: boolean | null
          live_url?: string | null
          name?: string
          playback_id?: string | null
          stream_key?: string | null
        }
        Relationships: []
      }
      podcast_creator_requests: {
        Row: {
          contact: string | null
          created_at: string | null
          creator_type: string | null
          description: string | null
          email: string | null
          full_name: string
          id: string
          ministry: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          contact?: string | null
          created_at?: string | null
          creator_type?: string | null
          description?: string | null
          email?: string | null
          full_name: string
          id?: string
          ministry: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          contact?: string | null
          created_at?: string | null
          creator_type?: string | null
          description?: string | null
          email?: string | null
          full_name?: string
          id?: string
          ministry?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      podcast_episodes: {
        Row: {
          audio_url: string | null
          channel_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          duration_sec: number | null
          episode_num: number | null
          id: string
          is_published: boolean | null
          media_type: string
          plays: number | null
          serie: string | null
          series_id: string | null
          title: string
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          audio_url?: string | null
          channel_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_sec?: number | null
          episode_num?: number | null
          id?: string
          is_published?: boolean | null
          media_type?: string
          plays?: number | null
          serie?: string | null
          series_id?: string | null
          title: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          audio_url?: string | null
          channel_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_sec?: number | null
          episode_num?: number | null
          id?: string
          is_published?: boolean | null
          media_type?: string
          plays?: number | null
          serie?: string | null
          series_id?: string | null
          title?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episodes_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "podcast_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_episodes_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "podcast_series"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_live_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          live_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          live_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          live_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_live_messages_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "podcast_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_lives: {
        Row: {
          channel_id: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
          title: string
          viewer_count: number
          youtube_live_url: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          title: string
          viewer_count?: number
          youtube_live_url?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          title?: string
          viewer_count?: number
          youtube_live_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_lives_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "podcast_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_progress: {
        Row: {
          completed: boolean | null
          episode_id: string | null
          id: string
          position_sec: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          episode_id?: string | null
          id?: string
          position_sec?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          episode_id?: string | null
          id?: string
          position_sec?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_progress_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "podcast_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_series: {
        Row: {
          channel_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          channel_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          channel_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_series_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "podcast_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_subscriptions: {
        Row: {
          channel_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_subscriptions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "podcast_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      points_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          points: number
          profile_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          points: number
          profile_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          points?: number
          profile_id?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          id: string
          poll_id: string | null
          position: number | null
          text: string
        }
        Insert: {
          id?: string
          poll_id?: string | null
          position?: number | null
          text: string
        }
        Update: {
          id?: string
          poll_id?: string | null
          position?: number | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_id: string | null
          poll_id: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_id?: string | null
          poll_id?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          option_id?: string | null
          poll_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_results"
            referencedColumns: ["option_id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          reaction_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          reaction_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "skills_directory"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          group_id: string | null
          id: string
          image_url: string | null
          type: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          type?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          group_id?: string | null
          id?: string
          image_url?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_posts_group"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          full_name: string | null
          id: string
          points_total: number | null
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          full_name?: string | null
          id: string
          points_total?: number | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          full_name?: string | null
          id?: string
          points_total?: number | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          joined_at: string | null
          profile_id: string
          project_id: string
          role: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          profile_id: string
          project_id: string
          role?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          profile_id?: string
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          id: string
          is_done: boolean | null
          project_id: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          is_done?: boolean | null
          project_id?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          is_done?: boolean | null
          project_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "group_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_current: number | null
          budget_goal: number | null
          category: string
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          budget_current?: number | null
          budget_goal?: number | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          budget_current?: number | null
          budget_goal?: number | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reactions: {
        Row: {
          author_id: string
          content_id: string
          created_at: string | null
          id: string
          type: string
        }
        Insert: {
          author_id: string
          content_id: string
          created_at?: string | null
          id?: string
          type: string
        }
        Update: {
          author_id?: string
          content_id?: string
          created_at?: string | null
          id?: string
          type?: string
        }
        Relationships: []
      }
      spiritual_levels: {
        Row: {
          badge_icon: string | null
          created_at: string | null
          id: string
          name: string
          points_max: number | null
          points_min: number
        }
        Insert: {
          badge_icon?: string | null
          created_at?: string | null
          id?: string
          name: string
          points_max?: number | null
          points_min: number
        }
        Update: {
          badge_icon?: string | null
          created_at?: string | null
          id?: string
          name?: string
          points_max?: number | null
          points_min?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          ban_reason: string | null
          banned_at: string | null
          is_banned: boolean | null
          role: string | null
          user_id: string
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string | null
          is_banned?: boolean | null
          role?: string | null
          user_id: string
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string | null
          is_banned?: boolean | null
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          price_range: string | null
          profile_id: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          price_range?: string | null
          profile_id?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          price_range?: string | null
          profile_id?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      group_events_with_rsvp: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string | null
          going_count: number | null
          group_id: string | null
          id: string | null
          location: string | null
          max_attendees: number | null
          maybe_count: number | null
          not_going_count: number | null
          title: string | null
          total_rsvp: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_results: {
        Row: {
          created_by: string | null
          ends_at: string | null
          group_id: string | null
          is_closed: boolean | null
          option_id: string | null
          poll_id: string | null
          position: number | null
          question: string | null
          text: string | null
          vote_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_polls_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "group_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_directory: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          full_name: string | null
          id: string | null
          level: string | null
          profile_id: string | null
          skill: string | null
          username: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
