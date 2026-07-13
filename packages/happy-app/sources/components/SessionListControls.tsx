import * as React from 'react';
import { Modal as RNModal, Platform, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { Text } from '@/components/StyledText';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { useLocalSettingMutable } from '@/sync/storage';
import { t } from '@/text';

const MENU_WIDTH = 248;
const MENU_MARGIN = 12;

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
    },
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.surface,
        borderRadius: 9,
        paddingHorizontal: 9,
        height: 34,
    },
    searchInput: {
        flex: 1,
        fontSize: 13.5,
        color: theme.colors.text,
        paddingVertical: 0,
        ...Typography.default(),
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    controlButton: {
        width: 34,
        height: 34,
        borderRadius: 9,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlButtonActive: {
        backgroundColor: theme.colors.surfaceSelected,
    },
    contextRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        paddingTop: 6,
        paddingHorizontal: 2,
    },
    scopeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.surfaceSelected,
        borderRadius: 999,
        paddingLeft: 10,
        paddingRight: 6,
        paddingVertical: 3,
    },
    scopeChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    machineLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 3,
    },
    machineLineText: {
        fontSize: 11.5,
        color: theme.colors.textSecondary,
        ...Typography.default(),
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
    menuItem: {
        minHeight: 40,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
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
    menuItemMeta: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    checkbox: {
        width: 17,
        height: 17,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: theme.colors.textSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: theme.colors.text,
        borderColor: theme.colors.text,
    },
    menuDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.divider,
        marginVertical: 6,
    },
}));

export interface ScopeProjectOption {
    path: string;
    title: string;
    hosts: string;
}

interface SessionListControlsProps {
    query: string;
    onQueryChange: (query: string) => void;
    inputRef?: React.RefObject<TextInput | null>;
    // All projects (unscoped) selectable in the scope menu
    projects: ScopeProjectOption[];
    // Machine name shown once here when every live session is on one machine
    singleHost: string | null;
    // Lets the list's global keyboard handler know the search field owns focus
    onSearchFocusChange?: (focused: boolean) => void;
}

/**
 * Sidebar control bar: search, the project-scope funnel (VS Code-style lock
 * to one or more projects, device-local), and a single sort button that
 * cycles between "grouped by project" and "all by recency". Below it, the
 * active scope is shown as a chip with one-tap unlock, and the machine name
 * appears once when it would be redundant on every row.
 */
export function SessionListControls({ query, onQueryChange, inputRef, projects, singleHost, onSearchFocusChange }: SessionListControlsProps) {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const [mode, setMode] = useLocalSettingMutable('sessionListMode');
    const [scopedProjects, setScopedProjects] = useLocalSettingMutable('sessionScopedProjects');
    const [menuAnchor, setMenuAnchor] = React.useState<{ x: number; y: number } | null>(null);
    const scopeButtonRef = React.useRef<View>(null);

    const scoped = scopedProjects.length > 0;

    const openScopeMenu = React.useCallback(() => {
        scopeButtonRef.current?.measureInWindow((x, y, _width, height) => {
            setMenuAnchor({ x, y: y + height + 4 });
        });
    }, []);
    const closeScopeMenu = React.useCallback(() => setMenuAnchor(null), []);

    const toggleProject = React.useCallback((path: string) => {
        setScopedProjects(scopedProjects.includes(path)
            ? scopedProjects.filter(p => p !== path)
            : [...scopedProjects, path]);
    }, [scopedProjects, setScopedProjects]);

    const cycleMode = React.useCallback(() => {
        setMode(mode === 'project' ? 'recent' : 'project');
    }, [mode, setMode]);

    const handleKeyPress = React.useCallback((event: any) => {
        if (Platform.OS === 'web' && event.nativeEvent?.key === 'Escape') {
            onQueryChange('');
            (inputRef?.current as any)?.blur?.();
        }
    }, [inputRef, onQueryChange]);

    const menuPosition = menuAnchor ? {
        left: Math.max(MENU_MARGIN, Math.min(windowWidth - MENU_WIDTH - MENU_MARGIN, menuAnchor.x + 34 - MENU_WIDTH)),
        top: Math.max(MENU_MARGIN, Math.min(windowHeight - 360, menuAnchor.y)),
    } : null;

    const scopeLabel = scopedProjects
        .map(p => p.split(/[/\\]/).filter(Boolean).pop() ?? p)
        .join(' + ');

    return (
        <View style={styles.container}>
            <View style={styles.bar}>
                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={15} color={theme.colors.textSecondary} />
                    <TextInput
                        ref={inputRef as any}
                        style={styles.searchInput}
                        value={query}
                        onChangeText={onQueryChange}
                        onKeyPress={handleKeyPress}
                        onFocus={() => onSearchFocusChange?.(true)}
                        onBlur={() => onSearchFocusChange?.(false)}
                        placeholder={t('sidebar.searchPlaceholder')}
                        placeholderTextColor={theme.colors.textSecondary}
                        autoCorrect={false}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <Pressable onPress={() => onQueryChange('')} hitSlop={8}>
                            <Ionicons name="close-circle" size={15} color={theme.colors.textSecondary} />
                        </Pressable>
                    )}
                </View>
                <Pressable
                    ref={scopeButtonRef as any}
                    accessibilityRole="button"
                    accessibilityLabel={t('sidebar.limitToProjects')}
                    onPress={openScopeMenu}
                    style={[styles.controlButton, scoped && styles.controlButtonActive]}
                >
                    <Ionicons name="funnel-outline" size={16} color={scoped ? theme.colors.text : theme.colors.textSecondary} />
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={mode === 'project' ? t('sidebar.sortModeProject') : t('sidebar.sortModeRecent')}
                    onPress={cycleMode}
                    style={styles.controlButton}
                >
                    <Ionicons
                        name={mode === 'project' ? 'folder-outline' : 'list-outline'}
                        size={16}
                        color={theme.colors.textSecondary}
                    />
                </Pressable>
            </View>

            {(scoped || singleHost) && (
                <View style={styles.contextRow}>
                    {scoped && (
                        <View style={styles.scopeChip}>
                            <Text style={styles.scopeChipText} numberOfLines={1}>{scopeLabel}</Text>
                            <Pressable onPress={() => setScopedProjects([])} hitSlop={8} accessibilityLabel={t('sidebar.allProjects')}>
                                <Ionicons name="close-circle" size={15} color={theme.colors.textSecondary} />
                            </Pressable>
                        </View>
                    )}
                    {singleHost && (
                        <View style={styles.machineLine}>
                            <Ionicons name="desktop-outline" size={11} color={theme.colors.textSecondary} />
                            <Text style={styles.machineLineText}>{singleHost}</Text>
                        </View>
                    )}
                </View>
            )}

            <RNModal
                animationType="none"
                onRequestClose={closeScopeMenu}
                transparent
                visible={!!menuPosition}
            >
                <Pressable onPress={closeScopeMenu} style={styles.backdrop} />
                {menuPosition && (
                    <View style={[styles.menu, menuPosition]}>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => setScopedProjects([])}
                            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                        >
                            <View style={[styles.checkbox, !scoped && styles.checkboxChecked]}>
                                {!scoped && <Ionicons name="checkmark" size={12} color={theme.colors.surface} />}
                            </View>
                            <Text style={styles.menuItemLabel}>{t('sidebar.allProjects')}</Text>
                        </Pressable>
                        <View style={styles.menuDivider} />
                        {projects.map(project => {
                            const checked = scopedProjects.includes(project.path);
                            return (
                                <Pressable
                                    key={project.path}
                                    accessibilityRole="button"
                                    onPress={() => toggleProject(project.path)}
                                    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                                >
                                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                                        {checked && <Ionicons name="checkmark" size={12} color={theme.colors.surface} />}
                                    </View>
                                    <Text style={styles.menuItemLabel} numberOfLines={1}>{project.title}</Text>
                                    <Text style={styles.menuItemMeta} numberOfLines={1}>{project.hosts}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </RNModal>
        </View>
    );
}
