import * as React from 'react';
import { Modal as RNModal, Platform, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { useSettingMutable } from '@/sync/storage';
import { t } from '@/text';

const MENU_WIDTH = 232;
const MENU_MARGIN = 12;

const stylesheet = StyleSheet.create((theme) => ({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        paddingHorizontal: 10,
        height: 36,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        paddingVertical: 0,
        ...Typography.default(),
        // RN Web renders a focus outline on the box already
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    controlButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    menu: {
        position: 'absolute',
        width: MENU_WIDTH,
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        overflow: 'hidden',
        paddingVertical: 6,
        shadowColor: theme.colors.shadow.color,
        shadowOpacity: theme.colors.shadow.opacity,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    menuSectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
        ...Typography.default('semiBold'),
    },
    menuItem: {
        minHeight: 40,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 10,
    },
    menuItemPressed: {
        backgroundColor: theme.colors.surfaceSelected,
    },
    menuItemLabel: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.text,
        ...Typography.default(),
    },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.divider,
        marginVertical: 6,
    },
}));

type GroupByValue = 'project' | 'date' | 'none';
type SortByValue = 'activity' | 'created' | 'name';

interface SessionListControlsProps {
    query: string;
    onQueryChange: (query: string) => void;
    inputRef?: React.RefObject<TextInput | null>;
}

/**
 * Sticky control bar at the top of the session list: a search field that
 * filters sessions by name / path / host, and a popover with group-by and
 * sort-by options for the list. Lives in the sidebar so the list can be
 * reorganized live without a trip to Settings.
 */
export function SessionListControls({ query, onQueryChange, inputRef }: SessionListControlsProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const [groupBy, setGroupBy] = useSettingMutable('sessionListGroupBy');
    const [sortBy, setSortBy] = useSettingMutable('sessionListSortBy');
    const [menuAnchor, setMenuAnchor] = React.useState<{ x: number; y: number } | null>(null);
    const buttonRef = React.useRef<View>(null);

    const openMenu = React.useCallback(() => {
        buttonRef.current?.measureInWindow((x, y, _width, height) => {
            setMenuAnchor({ x, y: y + height + 4 });
        });
    }, []);
    const closeMenu = React.useCallback(() => setMenuAnchor(null), []);

    const handleKeyPress = React.useCallback((event: any) => {
        if (Platform.OS === 'web' && event.nativeEvent?.key === 'Escape') {
            onQueryChange('');
            (inputRef?.current as any)?.blur?.();
        }
    }, [inputRef, onQueryChange]);

    const groupOptions: { value: GroupByValue; label: string }[] = [
        { value: 'project', label: t('sidebar.groupByProject') },
        { value: 'date', label: t('sidebar.groupByDate') },
        { value: 'none', label: t('sidebar.groupByNone') },
    ];
    const sortOptions: { value: SortByValue; label: string }[] = [
        { value: 'activity', label: t('sidebar.sortByActivity') },
        { value: 'created', label: t('sidebar.sortByCreated') },
        { value: 'name', label: t('sidebar.sortByName') },
    ];

    const menuPosition = menuAnchor ? {
        left: Math.max(MENU_MARGIN, Math.min(windowWidth - MENU_WIDTH - MENU_MARGIN, menuAnchor.x + 36 - MENU_WIDTH)),
        top: Math.max(MENU_MARGIN, Math.min(windowHeight - 320, menuAnchor.y)),
    } : null;

    const renderOption = <T extends string>(
        option: { value: T; label: string },
        selected: T,
        onSelect: (value: T) => void,
    ) => (
        <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
        >
            <Text style={styles.menuItemLabel}>{option.label}</Text>
            {option.value === selected && (
                <Ionicons name="checkmark" size={18} color={theme.colors.text} />
            )}
        </Pressable>
    );

    return (
        <View style={styles.bar}>
            <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={16} color={theme.colors.textSecondary} />
                <TextInput
                    ref={inputRef as any}
                    style={styles.searchInput}
                    value={query}
                    onChangeText={onQueryChange}
                    onKeyPress={handleKeyPress}
                    placeholder={t('sidebar.searchPlaceholder')}
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <Pressable onPress={() => onQueryChange('')} hitSlop={8}>
                        <Ionicons name="close-circle" size={16} color={theme.colors.textSecondary} />
                    </Pressable>
                )}
            </View>
            <Pressable
                ref={buttonRef as any}
                accessibilityRole="button"
                accessibilityLabel={t('sidebar.sortAndGroup')}
                onPress={openMenu}
                style={styles.controlButton}
            >
                <Ionicons name="swap-vertical-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>

            <RNModal
                animationType="none"
                onRequestClose={closeMenu}
                transparent
                visible={!!menuPosition}
            >
                <Pressable onPress={closeMenu} style={styles.backdrop} />
                {menuPosition && (
                    <View style={[styles.menu, menuPosition]}>
                        <Text style={styles.menuSectionTitle}>{t('sidebar.groupBy')}</Text>
                        {groupOptions.map(option => renderOption(option, groupBy, setGroupBy))}
                        <View style={styles.menuDivider} />
                        <Text style={styles.menuSectionTitle}>{t('sidebar.sortBy')}</Text>
                        {sortOptions.map(option => renderOption(option, sortBy, setSortBy))}
                    </View>
                )}
            </RNModal>
        </View>
    );
}
